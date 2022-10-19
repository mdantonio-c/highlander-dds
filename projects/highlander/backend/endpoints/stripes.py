from pathlib import Path
from typing import List, Optional, Any, Dict, Union

from flask import send_from_directory, send_file
import geopandas as gpd
import xarray as xr
import regionmask

from restapi import decorators
from restapi.exceptions import NotFound, ServerError
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log
from restapi.models import Schema, fields, validate
from marshmallow import ValidationError, pre_load

STRIPES_OUTPUT_ROOT = Path("/catalog/climate_stripes/")

STRIPES_INPUT_ROOT = Path("/catalog/datasets/datasets/climate_stripes/")

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
    nc_cropped = data_to_crop[data_variable][0].where(mask == np.isnan(mask))
    nc_cropped = nc_cropped.dropna("lat", how="all")  # TODO Chiedere Michele
    nc_cropped = nc_cropped.dropna("lon", how="all")  # TODO Chiedere Michele

    return nc_cropped


class StripesDetails(Schema):
    # Definition of query arguments.
    time_period = fields.Str(required=True, validate=validate.OneOf(TIME_PERIODS))
    administrative = fields.Str(required=True, validate=validate.OneOf(ADMINISTRATIVES))
    area_id = fields.Str(required=False)

    # Validation. Check whether an area_id is given when administrative is  "regions" or "provinces".
    @pre_load
    def params_validation(
       self, data: Dict[str, Union[str, None]], **kwargs: Any) -> Dict[str, Union[str, None]]:
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
    @decorators.use_kwargs(
        StripesDetails,
        location="query"
    )
    @decorators.auth.require()
    def get(self, user, dataset_id: str, time_period: str, administrative: str,
            area_id: Optional[str] = None) -> Response:

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
        output_dir = Path(STRIPES_OUTPUT_ROOT, output_path)  # Needed to create the output folder if it does not exist.
        filepath = Path(output_dir, output_filename)

        # Check if the stripes have already been created.
        # If they already exist.
        if filepath.is_file() and filepath.stat().st_size >= 1:
            return send_file(filepath)
            # Testing output:
            # res = "OK"
            # return self.response(res)

        # If they do not exist yet, then, create them.
        else:
            # Check if input data exists.
            input_filename = f"T_2M_1989-2020_{time_period}_anomalies.nc"
            data_filepath = Path(STRIPES_INPUT_ROOT, input_filename)

            if filepath.is_file() is False:
                raise NotFound(f"Data file {input_filename} not found in {data_filepath}")

            # If necessary crop the area.
            if administrative == "regions" or administrative == "provinces":
                try:
                    nc_data_to_plot = cropArea(
                        data_filepath, area_name, area
                    )
                except Exception as exc:
                    raise ServerError(f"Errors in cropping the data: {exc}")
            # Otherwise simply load data
            elif administrative == "Italy":
                nc_data = xr.open_dataset(data_filepath)
                nc_data_to_plot = nc_data[DATA_VARIABLE][0]

            # Create the output directory if it does not exists.
            if not output_dir.is_dir():
                output_dir.mkdir(parents=True, exist_ok=True)

            #  TODO INTEGRATE Michele's code. Input data is nc_data_to_plot.

            # Send the output
            return send_file(filepath)
            # Testing output:
            # res = "OK"
            # return self.response(res)

    # TODO
    #  Costruire l'ouput filepath: PATH/time_period/administrative. [DONE]
    #  Check se il file esiste. [DONE]
    #  return file se esiste. [DONE]
    #  se no vai a crearlo. [DONE]
    #  Check input exists. [DONE]
    #  Se non esiste return Not Found. [DONE]
    #  Se esiste Get data file. [DONE]
    #  Caso Italy: direttamente integrazione codice Michele.
    #  Caso regiony: Crop area (edit cropArea function) [DONE]
    #                e poi sull'output si applica il codice di Michele.
