import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import cartopy  # type: ignore
import cartopy.crs as ccrs  # type: ignore
import geopandas as gpd  # type: ignore
import matplotlib as mpl  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import numpy as np
import pandas as pd  # type: ignore
import regionmask  # type: ignore
import seaborn as sns  # type: ignore
import xarray as xr  # type: ignore
from flask import send_file
from highlander.connectors import broker
from marshmallow import ValidationError, pre_load
from restapi import decorators
from restapi.connectors import Connector
from restapi.exceptions import NotFound, ServerError
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import User
from restapi.utilities.logs import log

AREA_TYPES = ["regions", "provinces", "bbox", "polygon"]
TYPES = ["map", "plot"]
PLOT_TYPES = ["boxplot", "distribution"]
FORMATS = ["png", "json"]


GEOJSON_PATH = "/catalog/assets"

CROPS_OUTPUT_ROOT = "/catalog/crops/"


def plotMapNetcdf(field: Any, lat: Any, lon: Any, outputfile: Path) -> None:
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig1 = plt.figure(figsize=(18, 18))
    ax1 = fig1.add_subplot(111, projection=ccrs.PlateCarree())
    ax1.set(frame_on=False)
    ax1.axis("off")
    ax1.set_xticks(ax1.get_xticks())
    ax1.set_yticks(ax1.get_yticks())
    ax1.add_feature(cartopy.feature.LAND)
    ax1.add_feature(cartopy.feature.OCEAN)
    ax1.add_feature(cartopy.feature.COASTLINE)
    ax1.add_feature(cartopy.feature.BORDERS, color="k", linestyle=":")
    ax1.add_feature(cartopy.feature.LAKES)
    ax1.add_feature(cartopy.feature.RIVERS, color="b")
    ax1.gridlines(
        crs=ccrs.PlateCarree(),
        draw_labels=True,
        linewidth=1,
        color="gray",
        alpha=0.5,
        linestyle="--",
    )
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message="This usage of Quadmesh is deprecated: Parameters meshWidth and meshHeights will be removed; coordinates must be 2D; all parameters except coordinates will be keyword-only.",
        )
        cmesh = ax1.pcolormesh(lon, lat, field, cmap="viridis")  # ,vmin=0,vmax=10000)

    fig1.colorbar(
        cmesh, ax=ax1, shrink=np.round(min(len(lon) / len(lat), len(lat) / len(lon)), 2)
    )
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message='facecolor will have no effect as it has been defined as "never".',
        )
        fig1.savefig(outputfile, transparent=True)


def plotBoxplot(field: Any, outputfile: Path) -> None:
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig4, (ax4) = plt.subplots(
        1, 1, figsize=(15, 7)
    )  # len(field.lon)/100, len(field.lat)/100))
    sns.set_theme(style="ticks")
    sns.despine(fig4)
    sns.boxplot(data=field, whis=[1, 99], showfliers=False, palette="Set3")

    ax4.xaxis.set_major_formatter(mpl.ticker.ScalarFormatter())
    mpl.rcParams["font.size"] = 14
    # TODO label not hardcoded
    # ax4.set_xlabel('R-factor')  # ,fontsize=14)
    # TODO this label to have not to be hardcoded or it's the same for all the boxplots?
    ax4.set_ylabel("Count")  # ,fontsize=14)
    ax4.tick_params(axis="both", which="major")  # , labelsize=14)
    ax4.tick_params(axis="both", which="minor")  # , labelsize = 14)

    fig4.savefig(outputfile)


def plotDistribution(field: Any, outputfile: Path) -> None:
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig3, (ax3) = plt.subplots(
        1, 1, figsize=(3, 8)
    )  # len(field.lon)/100, len(field.lat)/100))
    sns.set_theme(style="ticks")
    sns.despine(fig3)
    sns.histplot(
        field,
        ax=ax3,
        edgecolor=".3",
        linewidth=0.5,
        log_scale=True,
    )
    ax3.xaxis.set_major_formatter(mpl.ticker.ScalarFormatter())
    mpl.rcParams["font.size"] = 14

    # TODO label not hardcoded
    # ax3.set_xlabel('R-factor')  # ,fontsize=14)
    # TODO this label to have not to be hardcoded or it's the same for all the boxplots?
    ax3.set_ylabel("Count")  # ,fontsize=14)
    ax3.tick_params(axis="both", which="major")  # , labelsize=14)
    ax3.tick_params(axis="both", which="minor")  # , labelsize = 14)

    fig3.savefig(outputfile)


def cropArea(netcdf_path: Path, area_name: str, area: Any, data_variable: str) -> None:
    # read the netcdf file
    data_to_crop = xr.open_dataset(netcdf_path)

    # create the polygon mask
    polygon_mask = regionmask.Regions(
        name=area_name,
        outlines=list(area.geometry.values[i] for i in range(0, area.shape[0])),
    )
    mask = polygon_mask.mask(data_to_crop, lat_name="lat", lon_name="lon")

    nc_cropped = data_to_crop[data_variable][0].where(mask == np.isnan(mask))
    nc_cropped = nc_cropped.dropna("lat", how="all")
    nc_cropped = nc_cropped.dropna("lon", how="all")
    return nc_cropped


class SubsetDetails(Schema):
    model_id = fields.Str(required=True)
    area_id = fields.Str(required=False)
    area_type = fields.Str(required=True, validate=validate.OneOf(AREA_TYPES))
    area_coords = fields.List(fields.Float(), required=False)
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
        elif area_type == "regions" or area_type == "provinces":
            if not area_id:
                raise ValidationError(
                    f"an areaa id has to be specified for {area_type} area type"
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
    @decorators.auth.require()
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/crop",
        summary="Get a subset of data",
        responses={
            200: "subset successfully retrieved",
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
        user: User,
        dataset_id: str,
        product_id: str,
        model_id: str,
        area_type: str,
        type: str,
        area_id: Optional[str] = None,
        area_coords: Optional[List[float]] = None,
        plot_type: Optional[str] = None,
        plot_format: str = "png",
    ) -> Any:
        if area_type == "regions" or area_type == "provinces":
            # get the geojson file
            geojson_file = Path(GEOJSON_PATH, f"italy-{area_type}.json")
            areas = gpd.read_file(geojson_file)
            # get the names that cope with the different geojson structures
            # TODO params and names in the two geojson files can be modified in order to correspond?
            if area_id:
                if area_type == "regions":
                    area_name = area_id.lower()
                    area_index = "name"
                else:
                    area_name = area_id.title()
                    area_index = "prov_name"

            # get the path of the crop
            output_dir = Path(
                CROPS_OUTPUT_ROOT, dataset_id, product_id, model_id, area_type
            )
            if type == "plot":
                if plot_format == "png":
                    output_filename = f"{area_name.replace(' ', '_').lower()}_{plot_type}.{plot_format}"
                else:
                    output_filename = (
                        f"{area_name.replace(' ', '_').lower()}.{plot_format}"
                    )
            else:
                output_filename = f"{area_name.replace(' ', '_').lower()}_map.png"

            filepath = Path(output_dir, output_filename)
            # get the mimetype
            if filepath.suffix == ".png":
                mimetype = "image/png"
            elif filepath.suffix == ".json":
                mimetype = "application/json"

            # check if the crop has already been created
            if filepath.is_file() and filepath.stat().st_size >= 1:
                return send_file(filepath, mimetype=mimetype)

            # get the area
            area = areas[areas[area_index] == area_name]
            if area.empty:
                raise NotFound(f"Area {area_id} not found in {area_type}")

            # get the map to crop
            dds = broker.get_instance()
            # check if the dataset exists
            dataset_details = dds.get_dataset_details([dataset_id])
            if not dataset_details["data"]:
                raise NotFound(f"dataset {dataset_id} not found")

            # check if product exists
            dataset_products = dataset_details["data"][0]["products"]
            product_details: Optional[Dict[str, Any]] = None
            for p in dataset_products:
                if p["id"] == product_id:
                    product_details = p
                    break
            if not product_details:
                raise NotFound(
                    f"product {product_id} for dataset {dataset_id} not found"
                )

            product_urlpath = dds.broker.catalog[dataset_id][product_id].urlpath

            product_dir = Path(product_urlpath).parents[0]
            if not product_dir.is_dir():
                raise NotFound(f"data for product {product_id} not found")

            # get the file corresponding to the requested model
            data_to_crop_filename = (
                Path(product_urlpath)
                .name.replace("*", model_id, 1)
                .replace("*", "regular")
            )
            data_to_crop_filepath = product_dir.joinpath(data_to_crop_filename)
            if not data_to_crop_filepath.is_file():
                log.debug(data_to_crop_filepath)
                raise NotFound(
                    f"Data not found for {model_id} model and product {product_id}"
                )
            # get the data variable
            nc_variable = product_details["variables"][0]["value"]

            # crop the area
            try:
                nc_cropped = cropArea(
                    data_to_crop_filepath, area_name, area, nc_variable
                )
            except Exception as exc:
                raise ServerError(f"Errors in cropping the data: {exc}")

            # create the output directory if it does not exists
            if not output_dir.is_dir():
                output_dir.mkdir(parents=True, exist_ok=True)

            try:
                if type == "map":
                    # plot the cropped map
                    plotMapNetcdf(
                        nc_cropped.values,
                        nc_cropped.lat.values,
                        nc_cropped.lon.values,
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
                                columns=[str(data_to_crop_filepath)[:-21]],
                            ),
                        ],
                        axis=1,
                    )
                    if plot_format == "json":
                        df_stas.to_json(path_or_buf=filepath)
                        return send_file(filepath, mimetype=mimetype)

                    # if not json plot the image
                    if plot_type == "boxplot":
                        plotBoxplot(df_stas, filepath)
                    elif plot_type == "distribution":
                        plotDistribution(df_stas, filepath)

            except Exception as exc:
                raise ServerError(f"Errors in plotting the data: {exc}")

            # check that the output has been correctly created
            if not filepath.is_file() or not filepath.stat().st_size >= 1:
                raise ServerError("Errors in plotting the data")

            return send_file(filepath, mimetype=mimetype)

        else:
            # case of custom areas:
            # The data are cropped and streamed. Cropped data are not saved in the folders and
            # TODO: to be implemented
            log.debug("Custom area cropping")
            return self.empty_response()
