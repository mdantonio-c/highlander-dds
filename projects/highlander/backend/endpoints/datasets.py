import os
from typing import Any, Dict, List

import dds_backend.core.base.ex as ex
from flask import send_from_directory
from highlander.connectors import broker
from highlander.models.schemas import DatasetSchema
from restapi import decorators
from restapi.exceptions import NotFound, ServiceUnavailable
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log

CATALOG_DIR = os.environ.get("CATALOG_DIR", "/catalog")


class Datasets(EndpointResource):
    @decorators.endpoint(
        path="/datasets",
        summary="Get datasets",
        description="Return all available datasets",
        responses={
            200: "Datasets successfully retrieved",
        },
    )
    @decorators.marshal_with(DatasetSchema(many=True), code=200)
    def get(self) -> Response:
        dds = broker.get_instance()
        # get the list of datasets
        datasets: List[Any] = []
        for ds in dds.broker.list_datasets():
            log.debug("get details for dataset <{}>", ds)
            details = dds.broker.get_details(ds, extended=True)
            details["name"] = ds
            datasets.append(details)
        return self.response(datasets)


class Dataset(EndpointResource):
    labels = ["dataset"]

    @decorators.endpoint(
        path="/datasets/<dataset_name>",
        summary="Get a dataset by name",
        description="Return the dataset filtered by unique name, if it exists",
        responses={
            200: "Dataset successfully retrieved",
            404: "Dataset does not exist",
        },
    )
    @decorators.marshal_with(DatasetSchema, code=200)
    def get(self, dataset_name: str) -> Response:
        log.debug("Get dataset <{}>", dataset_name)
        dds = broker.get_instance()
        try:
            details = dds.broker.get_details(dataset_name, extended=True)
            log.debug(details)
            details["name"] = dataset_name
        except ex.DMSKeyError as e:
            raise NotFound(str(e)[1:-1])
        return self.response(details)


class DatasetImage(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_name>/image",
        summary="Get dataset image",
        description="Return the dataset thumbnail image",
        responses={
            200: "Dataset image successfully retrieved",
            404: "Dataset Image not found",
        },
    )
    def get(self, dataset_name: str) -> Response:
        log.debug("Get image for dataset <{}>", dataset_name)
        dds = broker.get_instance()
        try:
            details = dds.broker.get_details(dataset_name, extended=True)
            image_filename = details["dataset_info"]["image"]
            if not image_filename:
                raise ex.DMSKeyError("Dataset image is missing")
            images_dir = f"{CATALOG_DIR}/images"
            if not os.path.exists(os.path.join(images_dir, image_filename)):
                raise ex.DMSKeyError("Dataset image not found")
            return send_from_directory(images_dir, image_filename)
        except ex.DMSKeyError as e:
            raise NotFound(str(e)[1:-1])
