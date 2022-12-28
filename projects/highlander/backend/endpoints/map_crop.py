import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd  # type: ignore
from flask import send_file
from highlander.connectors import broker
from highlander.endpoints.utils import MapCropConfig as config
from highlander.endpoints.utils import PlotUtils
from marshmallow import ValidationError, pre_load
from restapi import decorators
from restapi.connectors import Connector
from restapi.exceptions import BadRequest, NotFound, ServerError
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log

AREA_TYPES = ["regions", "provinces", "basins", "bbox", "polygon"]
DAILY_METRICS = ["daymax", "daymin", "daymean"]
TYPES = ["map", "plot"]
PLOT_TYPES = ["boxplot", "distribution"]
FORMATS = ["png", "json"]
MIMETYPES_MAP = {".png": "image/png", ".json": "application/json"}


class SubsetDetails(Schema):
    model_id = fields.Str(required=False)
    year = fields.Str(required=False)
    date = fields.Str(required=False)
    area_id = fields.Str(required=False)
    area_type = fields.Str(required=True, validate=validate.OneOf(AREA_TYPES))
    area_coords = fields.List(fields.Float(), required=False)
    indicator = fields.Str(required=True)
    daily_metric = fields.Str(required=False, validate=validate.OneOf(DAILY_METRICS))
    time_period = fields.Str(required=False)
    type = fields.Str(required=True, validate=validate.OneOf(TYPES))
    plot_type = fields.Str(required=False, validate=validate.OneOf(PLOT_TYPES))
    plot_format = fields.Str(required=False, validate=validate.OneOf(FORMATS))

    @pre_load
    def params_validation(
        self, data: Dict[str, Union[str, list[float]]], **kwargs: Any
    ) -> Dict[str, Union[str, list[float]]]:
        area_type = data.get("area_type")
        area_coords = data.get("area_coords", None)
        area_id = data.get("area_id", None)
        # check if area coords are needed
        if area_type == "bbox" or area_type == "polygon":
            if not area_coords:
                raise ValidationError(
                    f"coordinates have to be specified for {area_type} area type"
                )
        # check if area_id is needed
        else:
            if not area_id:
                raise ValidationError(
                    f"an area id has to be specified for {area_type} area type"
                )

        # check if plot type is needed. A plot type has to be specified only if the requested output is a png
        type = data.get("type")
        plot_type = data.get("plot_type", None)
        plot_format = data.get("plot_format", None)
        if not plot_format or plot_format == "png":
            if type == "plot" and not plot_type:
                raise ValidationError("a plot type have to be specified")

        return data


class MapCrop(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/crop",
        summary="Get a subset of data",
        responses={
            200: "subset successfully retrieved",
            400: "missing parameters to get the file to crop",
            404: "Area or model not found",
            500: "Errors in cropping or plotting the data",
        },
    )
    @decorators.use_kwargs(
        SubsetDetails,
        location="query",
    )
    def get(
        self,
        dataset_id: str,
        product_id: str,
        area_type: str,
        type: str,
        indicator: str,
        model_id: Optional[str] = None,
        year: Optional[str] = None,
        date: Optional[str] = None,
        daily_metric: Optional[str] = None,
        time_period: Optional[str] = None,
        area_id: Optional[str] = None,
        area_coords: Optional[List[float]] = None,
        plot_type: Optional[str] = None,
        plot_format: str = "png",
    ) -> Any:

        dds = broker.get_instance()
        # check if the dataset exists
        dataset_details = dds.get_dataset_details([dataset_id])
        if not dataset_details["data"]:
            raise NotFound(f"dataset {dataset_id} not found")

        # check if product exists
        dataset_products = dataset_details["data"][0]["products"]
        product_details: Optional[Dict[str, Any]] = None
        for p in dataset_products:
            if product_id in p["id"]:
                product_details = p
                break
            # check if there are exception for the product
            if (
                dataset_id in config.PRODUCT_EXCEPTION.keys()
                and product_id in config.PRODUCT_EXCEPTION[dataset_id].keys()
                and p["id"] == config.PRODUCT_EXCEPTION[dataset_id][product_id]
            ):
                product_details = p
                break
            # # case of humanwellbeing multi-year: product not in dds but its details are the same of the daily
            # if (
            #     dataset_id == "human-wellbeing"
            #     and product_id == "multi-year"
            #     and p["id"] == "daily"
            # ):
            #     product_details = p
            #     break
        if not product_details:
            raise NotFound(f"product {product_id} for dataset {dataset_id} not found")

        # check mandatory params according to dataset and product
        endpoint_arguments = locals()
        try:
            for product, param_list in config.MANDATORY_PARAM_MAP[dataset_id].items():
                if product == product_id or product == "all_products":
                    for param in param_list:
                        if not endpoint_arguments[param]:
                            raise BadRequest(
                                f"{param} parameter is needed for {product_id} product in {dataset_id}"
                            )
        except KeyError:
            raise ServerError(f"{dataset_id} not found in Mandatory param map")

        year_day: Optional[int] = None
        if date and product == "daily":
            year_day = int(datetime.datetime.strptime(date, "%Y-%m-%d").strftime("%j"))

        if area_type != "bbox" or area_type != "polygon":
            # get the area
            area_name, area = PlotUtils.getArea(area_id, area_type)
            if area.empty:
                raise NotFound(f"Area {area_name} not found in {area_type}")
        else:
            # case of custom areas:
            # The data are cropped and streamed. Cropped data are not saved in the folders and
            # TODO: to be implemented
            log.debug("Custom area cropping")
            return self.empty_response()

        # get the output structure
        output_structure = config.getOutputPath(
            dataset_id, product_id, endpoint_arguments
        )
        if not output_structure:
            raise ServerError(
                f"{dataset_id} or {product_id} keys not present in output structure map"
            )
        # get the output filename
        output_filename = config.getOutputFilename(
            type, plot_format, plot_type, area_name
        )

        # build the filepath
        output_dir = config.CROPS_OUTPUT_ROOT.joinpath(*output_structure)
        log.debug(f"Output dir: {output_dir}")
        filepath = Path(output_dir, output_filename)

        # check if the crop has already been created
        if filepath.is_file() and filepath.stat().st_size >= 1:
            return send_file(filepath, mimetype=MIMETYPES_MAP[filepath.suffix])

        # get the map to crop
        # check if the model name and the filename correspond
        if model_id:
            model_filename: str = model_id
            for m, v in config.MODELS_MAPPING.items():
                if m in model_id:
                    model_filename = model_id.replace(m, v)

        # get the file urlpath
        product_urlpath = dds.broker.catalog[dataset_id][product_details["id"]].urlpath
        log.debug(product_urlpath)
        product_urlpath_root = product_urlpath.split(dataset_id)[0]
        if dataset_id == "era5-downscaled-over-italy":
            product_urlpath_root = product_urlpath.split("vhr-rea")[0]
        log.debug(product_urlpath_root)
        try:
            data_to_crop_url = f"{product_urlpath_root}{config.SOURCE_FILE_URL_MAP[dataset_id][product_id]['url']}"
        except KeyError:
            raise ServerError(
                f"{dataset_id} or {product_id} keys not present in source file url map"
            )
        # substitute the parameters
        endpoint_variables = locals()
        if "params" in config.SOURCE_FILE_URL_MAP[dataset_id][product_id]:
            for p in config.SOURCE_FILE_URL_MAP[dataset_id][product_id]["params"]:
                data_to_crop_url = data_to_crop_url.replace(p, endpoint_variables[p])

        data_to_crop_filepath = Path(data_to_crop_url)

        if not data_to_crop_filepath.is_file():
            raise NotFound(
                f"Requested data to crop not found: source file {data_to_crop_filepath} does not exists"
            )
        log.debug(f"source path of the data to crop: {data_to_crop_filepath}")

        # get the data variable. The data variable is ALWAYS equal to the lowercase indicator
        try:
            nc_variable = config.VARIABLES_MAP[indicator]
        except KeyError:
            raise NotFound(
                f"indicator {indicator} for product {product_id} for dataset {dataset_id} not found"
            )

        # names for variables in forest species projections are different. This is an exception for this case
        # TODO try to get a correct file in order to delete this exception
        if product_id == "forest-species-suitability-proj":
            nc_variable = f"{nc_variable.split('_')[0].title()}{nc_variable.split('_')[1].title()}"

        # crop the area
        try:
            has_time = True
            if product_id in config.PRODUCT_WOUT_TIME:
                has_time = False

            nc_cropped = PlotUtils.cropArea(
                data_to_crop_filepath,
                area_name,
                area,
                nc_variable,
                year_day,
                has_time,
            )
        except Exception as exc:
            raise ServerError(f"Errors in cropping the data: {exc}")
        # create the output directory if it does not exists
        output_dir.mkdir(parents=True, exist_ok=True)
        try:
            if type == "map":
                # plot the cropped map
                PlotUtils.plotMapNetcdf(
                    nc_cropped.values,
                    nc_cropped.lat.values,
                    nc_cropped.lon.values,
                    nc_cropped.units,
                    nc_cropped.long_name,
                    product_id,
                    filepath,
                )
            else:
                # plot the boxplot
                df_stas = pd.DataFrame([])
                df_stas = pd.concat(
                    [
                        df_stas,
                        pd.DataFrame(
                            np.array(nc_cropped.values).ravel(),
                            columns=[str(product_id)],  # data_to_crop_filepath)[:-21]],
                        ),
                    ],
                    axis=1,
                )
                log.debug("Colums")
                log.debug(df_stas.columns[0][-4:])

                if plot_format == "json":
                    df_stas.to_json(path_or_buf=filepath)
                    return send_file(filepath, mimetype=MIMETYPES_MAP[filepath.suffix])

                # if not json plot the image
                if plot_type == "boxplot":
                    PlotUtils.plotBoxplot(df_stas, filepath)
                elif plot_type == "distribution":
                    PlotUtils.plotDistribution(df_stas, filepath, nc_cropped.long_name)

        except Exception as exc:
            raise ServerError(f"Errors in plotting the data: {exc}")

        # check that the output has been correctly created
        if not filepath.is_file() or not filepath.stat().st_size >= 1:
            raise ServerError("Errors in plotting the data")

        return send_file(filepath, mimetype=MIMETYPES_MAP[filepath.suffix])
