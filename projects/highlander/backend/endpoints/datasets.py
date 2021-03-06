import os

from flask import send_from_directory
from highlander.connectors import broker
from highlander.constants import CATALOG_DIR
from highlander.models.schemas import DatasetInfo, ProductInfo
from restapi import decorators
from restapi.exceptions import NotFound, ServiceUnavailable
from restapi.models import fields
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log


class Datasets(EndpointResource):
    @decorators.endpoint(
        path="/datasets",
        summary="Get datasets",
        description="Return all available datasets",
        responses={
            200: "Datasets successfully retrieved",
        },
    )
    @decorators.use_kwargs(
        {"application": fields.Bool(required=False)}, location="query"
    )
    @decorators.marshal_with(DatasetInfo(many=True), code=200)
    def get(self, application: bool = False) -> Response:
        log.debug("Is application dataset? {}", application)
        dds = broker.get_instance()
        details = dds.get_dataset_details()["data"]
        res = [x for x in details if x.get("application", False) == application]
        return self.response(res)


class Dataset(EndpointResource):
    labels = ["dataset"]

    @decorators.endpoint(
        path="/datasets/<dataset_id>",
        summary="Get a dataset by id",
        description="Return the dataset filtered by unique id, if it exists",
        responses={
            200: "Dataset successfully retrieved",
            404: "Dataset does not exist",
        },
    )
    @decorators.marshal_with(DatasetInfo, code=200)
    def get(self, dataset_id: str) -> Response:
        log.debug("Get dataset <{}>", dataset_id)
        dds = broker.get_instance()
        details = dds.get_dataset_details([dataset_id])["data"]
        if not details:
            raise NotFound(f"Dataset ID<{dataset_id}> not found")
        return self.response(details[0])


class DatasetProduct(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>",
        summary="Get dataset product",
        description="Return the dataset product info",
        responses={
            200: "Dataset product successfully retrieved",
            404: "Dataset product not found",
        },
    )
    @decorators.marshal_with(ProductInfo, code=200)
    def get(self, dataset_id: str, product_id: str) -> Response:
        log.debug("Get product <{}> for dataset <{}>", product_id, dataset_id)
        dds = broker.get_instance()
        data = dds.get_product_for_dataset(dataset_id, product_id)
        # log.debug(data)
        return self.response(data)


class DatasetImage(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/image",
        summary="Get dataset image",
        description="Return the dataset thumbnail image",
        responses={
            200: "Dataset image successfully retrieved",
            404: "Dataset Image not found",
        },
    )
    def get(self, dataset_id: str) -> Response:
        log.debug("Get image for dataset <{}>", dataset_id)
        try:
            dds = broker.get_instance()
            image_filename = dds.get_dataset_image_filename(dataset_id)
            if not image_filename:
                raise LookupError("Dataset image not configured")
            images_dir = f"{CATALOG_DIR}/images"
            if not os.path.exists(os.path.join(images_dir, image_filename)):
                raise LookupError(f"Dataset file image <{image_filename}> not found")
            return send_from_directory(images_dir, image_filename)
        except LookupError as e:
            raise NotFound(str(e))
