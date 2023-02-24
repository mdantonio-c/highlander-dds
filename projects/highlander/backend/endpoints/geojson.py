from pathlib import Path
from typing import Any

from flask import send_file
from highlander.catalog import CatalogExt
from highlander.constants import CATALOG_DIR
from highlander.endpoints.utils import MapCropConfig as config
from restapi import decorators
from restapi.exceptions import BadRequest, NotFound
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log

CATALOG_EXT_DIR = f"{CATALOG_DIR}/catalog-ext.yaml"


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


class JsonData(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/json/<filename>",
        summary="Get a json data",
        responses={
            200: "json data file successfully retrieved",
            400: "the selected dataset does not have json data",
            404: "json data file not found",
        },
    )
    def get(
        self,
        dataset_id: str,
        filename: str,
    ) -> Any:
        # get the source filepath from the dataset
        try:
            cat_ext = CatalogExt(path=CATALOG_EXT_DIR)
            external_datasets = cat_ext.get_datasets()
        except ValueError:
            # for missing or invalid cat_ext
            raise NotFound("Not found Datasets with Json data")
        if not external_datasets:
            raise NotFound("Not found Datasets with Json data")

        dataset_details = None
        for d in external_datasets:
            if d.get("id", None) == dataset_id:
                dataset_details = d
                break
        if not dataset_details:
            raise NotFound(f"dataset {dataset_id} not found")

        if "source_path" not in dataset_details:
            raise BadRequest(f"No path for sources was found for dataset {dataset_id}")

        source_path = dataset_details["source_path"]

        # get the filepath
        json_filepath = Path(source_path, f"{filename}.json")
        # log.debug(json_filepath)

        # check if file exists
        if not json_filepath.exists():
            raise NotFound(f"file {filename}.json not found")

        # return the retrieved file
        return send_file(json_filepath, mimetype="application/json")
