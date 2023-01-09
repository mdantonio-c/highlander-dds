from pathlib import Path
from typing import Any

from flask import send_file
from highlander.endpoints.utils import MapCropConfig as config
from restapi import decorators
from restapi.exceptions import NotFound
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log


class GeoJson(EndpointResource):
    @decorators.endpoint(
        path="/geojson/<filename>",
        summary="Get a geojson file",
        responses={
            200: "geojson file successfully retrieved",
            404: "geojson file not found",
        },
    )
    def get(
        self,
        filename: str,
    ) -> Any:
        # get the filepath
        geojson_filepath = Path(config.GEOJSON_PATH, f"{filename}.json")

        # check if file exists
        if not geojson_filepath.exists():
            raise NotFound(f"file {filename}.json not found")

        # return the retrieved file
        return send_file(geojson_filepath, mimetype="application/json")
