import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import geopandas as gpd
import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import regionmask
import xarray as xr
from flask import send_file, send_from_directory
from highlander.connectors import broker
from marshmallow import ValidationError, pre_load
from restapi import decorators
from restapi.connectors import Connector
from restapi.exceptions import NotFound, ServerError
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import User
from restapi.utilities.logs import log

STRIPES_OUTPUT_ROOT = Path("/catalog/climate_stripes/")

# STRIPES_INPUT_ROOT = Path("/catalog/datasets/datasets/climate_stripes/")

ADMINISTRATIVES = ["Italy", "regions", "provinces"]

TIME_PERIODS = ["ANN", "DJF", "JJA", "MAM", "SON"]

GEOJSON_PATH = "/catalog/assets"

DATA_VARIABLE = "T_2M"


def cropArea(
    netcdf_path: Path,
    area_name: str,
    area: Any,
    data_variable: str = DATA_VARIABLE,
) -> Any:
    # Function to crop the data to be plotted.
    # Read the netcdf file.
    data_to_crop = xr.open_dataset(netcdf_path)

    # Create the polygon mask.
    polygon_mask = regionmask.Regions(
        name=area_name,
        outlines=list(area.geometry.values[i] for i in range(0, area.shape[0])),
    )
    mask = polygon_mask.mask(data_to_crop, lat_name="lat", lon_name="lon")

    # Apply mask.
    nc_cropped = data_to_crop[data_variable][:].where(mask == np.isnan(mask))
    nc_cropped = nc_cropped.dropna("lat", how="all")
    nc_cropped = nc_cropped.dropna("lon", how="all")

    return nc_cropped


def plotStripes(array, yearsList: list, region_id: str, fileOutput: str):
    region_id = f"{region_id.replace('_', ' ').title()}"
    fig, ax = plt.subplots(figsize=(20, 8))
    fig.subplots_adjust(bottom=0.25, left=0.25)  # make room for labels
    mpl.rcParams["font.size"] = 20
    min_val = math.floor(array.min())  # np.round(array.min()*10)/10
    max_val = math.ceil(array.max())  # np.round(array.max()*10)/10
    stripes = plt.pcolormesh(array, vmin=min_val, vmax=max_val, cmap="bwr")
    cbar = plt.colorbar(stripes, label="Air temperature [°C]")
    ax.set_title(region_id, alpha=1)
    ax.set_xticks(np.arange(array.shape[1]) + 0.5, minor=False)
    ax.set_xticklabels(yearsList, rotation=90, size=15)
    ax.axes.get_yaxis().set_visible(False)
    plt.show()
    fig.savefig(fileOutput, transparent=True, bbox_inches="tight", pad_inches=0)


class StripesDetails(Schema):
    # Definition of query arguments.
    time_period = fields.Str(required=True, validate=validate.OneOf(TIME_PERIODS))
    administrative = fields.Str(required=True, validate=validate.OneOf(ADMINISTRATIVES))
    area_id = fields.Str(required=False)

    # Validation. Check whether an area_id is given when administrative is  "regions" or "provinces".
    @pre_load
    def params_validation(
        self, data: Dict[str, Union[str, None]], **kwargs: Any
    ) -> Dict[str, Union[str, None]]:
        administrative = data.get("administrative")
        area_id = data.get("area_id", None)
        # check if area_id is needed
        if administrative == "regions" or administrative == "provinces":
            if not area_id:
                raise ValidationError(
                    f"an area id has to be specified for {administrative} administrative"
                )
        return data


class Stripes(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/stripes",  # TODO. Decide if we fix the dataset_id.
        summary="Get climate stripes",
        responses={
            200: "Climate stripes successfully retrieved",
            400: "missing parameters",
            404: "Area not found",
            500: "Errors in cropping or plotting the data",
        },
    )
    @decorators.use_kwargs(StripesDetails, location="query")
    @decorators.auth.require()
    def get(
        self,
        user: User,
        dataset_id: str,
        time_period: str,
        administrative: str,
        area_id: Optional[str] = None,
    ) -> Response:

        # Normalise area_id names to standard format that cope with the different geojson structures.
        if administrative == "regions" or administrative == "provinces":
            # get the geojson file
            geojson_file = Path(GEOJSON_PATH, f"italy-{administrative}.json")
            areas = gpd.read_file(geojson_file)
            # get the names that cope with the different geojson structures
            if area_id:
                if administrative == "regions":
                    area_name = area_id.lower()
                    area_index = "name"
                else:
                    area_name = area_id.title()
                    area_index = "prov_name"

            # Get the area. Check if it exists and if it does not,then  raise an error.
            area = areas[areas[area_index] == area_name]
            if area.empty:
                raise NotFound(f"Area {area_id} not found in {administrative}")

        elif administrative == "Italy":
            # I define an area_name also for italy case to be able to create a single output file definition.
            area_name = administrative

        # Create an output file name and path:
        output_filename = f"{area_name.replace(' ', '_').lower()}_stripes.png"
        output_path = f"{time_period}/{administrative}"
        output_dir = Path(
            STRIPES_OUTPUT_ROOT, output_path
        )  # Needed to create the output folder if it does not exist.
        output_filepath = Path(output_dir, output_filename)

        # Check if the stripes have already been created.
        # If they already exist.
        if output_filepath.is_file() and output_filepath.stat().st_size >= 1:
            return send_file(output_filepath)
            # Testing output:
            # res = f"OK / Stripes already created at {output_filepath}"
            # return self.response(res)

        # If they do not exist yet, then, create them.
        else:

            # We define a STRIPES_INPUT_ROOT using the details of a dataset available in the dds.
            dds = broker.get_instance()
            try:
                product_urlpath = dds.broker.catalog[dataset_id][
                    "VHR-REA_IT_1989_2020_hourly"
                ].urlpath
                product_urlpath_root = product_urlpath.split("vhr-rea")[0]
            except Exception as exc:
                raise NotFound(f"Unable to get dataset url root: {exc}")

            # Check if input data exists.
            input_filename = f"T_2M_1989-2020_{time_period}_anomalies.nc"
            data_filepath = Path(
                product_urlpath_root, "climate_stripes", input_filename
            )

            if data_filepath.is_file() is False:
                raise NotFound(
                    f"Data file {input_filename} not found in {data_filepath}"
                )

            # If necessary crop the area.
            if administrative == "regions" or administrative == "provinces":
                try:
                    nc_data_to_plot = cropArea(data_filepath, area_name, area)
                except Exception as exc:
                    raise ServerError(f"Errors in cropping the data: {exc}")
                else:
                    nc_data_to_plot_mean = nc_data_to_plot.mean(
                        axis=(1, 2)
                    ).values.reshape((1, len(nc_data_to_plot.time)))
                    nc_data_to_plot_years = [
                        str(x.astype("datetime64[Y]"))
                        for x in nc_data_to_plot.time.values
                    ]
            # Otherwise simply load data
            elif administrative == "Italy":
                nc_data = xr.open_dataset(data_filepath)
                nc_data_to_plot = nc_data[DATA_VARIABLE][:]
                nc_data_to_plot_mean = nc_data_to_plot.mean(axis=(1, 2)).values.reshape(
                    (1, len(nc_data_to_plot.time))
                )
                nc_data_to_plot_years = [
                    str(x.astype("datetime64[Y]")) for x in nc_data_to_plot.time.values
                ]

            # Create the output directory if it does not exists.
            if not output_dir.is_dir():
                output_dir.mkdir(parents=True, exist_ok=True)

            # Plot stripes.
            try:
                plotStripes(
                    nc_data_to_plot_mean,
                    nc_data_to_plot_years,
                    area_name,
                    output_filepath,
                )
            except Exception as exc:
                raise ServerError(f"Errors in plotting the data: {exc}")

            # Send the output
            return send_file(output_filepath)
            # Testing output:
            # res = f"OK / Stripes created at {output_filepath}"
            # return self.response(res)
