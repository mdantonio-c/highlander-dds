import glob
from pathlib import Path
from typing import List, Optional

from flask import send_from_directory
from highlander.catalog import CatalogExt
from highlander.connectors import broker
from highlander.constants import CATALOG_DIR
from highlander.exceptions import NotYetImplemented
from highlander.models.schemas import DatasetInfo, DateStruct, ProductInfo
from restapi import decorators
from restapi.exceptions import NotFound
from restapi.models import fields
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log

AVAILABLE_PERIODIC_PRODUCTS = ["crop-water:crop-water"]
CATALOG_EXT_DIR = f"{CATALOG_DIR}/catalog-ext.yaml"


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
    @decorators.cache(timeout=0)
    def get(self, application: Optional[bool] = None) -> Response:
        log.debug("Filter for application dataset? {}", application)
        dds = broker.get_instance()
        details = dds.get_dataset_details()["data"]
        res = [
            x
            for x in details
            if application is None or x.get("application", False) == application
        ]
        # additional external applications?
        if application:
            try:
                cat_ext = CatalogExt(path=CATALOG_EXT_DIR)
                out = cat_ext.get_datasets()
                res.extend(out)
            except ValueError:
                # for missing or invalid cat_ext
                pass
        else:
            # exclude unwanted datasets (no applied to applications)
            res = [x for x in res if not x.get("exclude", False)]
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
    @decorators.use_kwargs(
        {"application": fields.Bool(required=False)}, location="query"
    )
    @decorators.marshal_with(DatasetInfo, code=200)
    def get(self, dataset_id: str, application: bool = False) -> Response:
        log.debug("Get dataset <{}>", dataset_id)
        dds = broker.get_instance()
        details = dds.get_dataset_details([dataset_id])["data"]
        if not details:
            if application:
                # check in the external catalog
                try:
                    cat_ext = CatalogExt(path=CATALOG_EXT_DIR)
                    out = cat_ext.get_datasets()
                    for d in out:
                        if d.get("id", None) == dataset_id:
                            details = d
                            break
                except ValueError:
                    # for missing or invalid cat_ext
                    pass
                if details:
                    return self.response(details)
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


class DatasetProductReady(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/ready",
        summary="Get the all available run periods for a specific dataset product",
        responses={
            200: "Run periods successfully retrieved",
            404: "Periodic runs not available for specified dataset product",
        },
    )
    @decorators.marshal_with(DateStruct(many=True), code=200)
    def get(self, dataset_id: str, product_id: str) -> Response:
        log.debug("Get RUN periods for <{}:{}>", dataset_id, product_id)
        # check for valid periodic dataset products
        if f"{dataset_id}:{product_id}" not in AVAILABLE_PERIODIC_PRODUCTS:
            raise NotFound(
                f"Periodic runs not available for <{dataset_id}:{product_id}>"
            )

        data: List[DateStruct] = []

        dds = broker.get_instance()
        url_path = dds.broker.catalog[dataset_id][product_id].urlpath

        if dataset_id == "crop-water":
            p = url_path.partition("monthlyForecast")
            my_path = Path(p[0], p[1])
            output = set()
            for name in glob.glob(f"{my_path.as_posix()}/*"):
                output.add(Path(name).name)
            for val in sorted(output, reverse=True):
                year, month, day = val.split("-")
                data.append(
                    DateStruct().dump(
                        {"year": int(year), "month": int(month), "day": int(day)}
                    )
                )
        else:
            raise NotYetImplemented(
                f"Extraction of 'run periods' for <{dataset_id}:{product_id}> NOT yet implemented"
            )
        return self.response(data)


class DatasetContent(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/content",
        summary="Get dataset related content",
        description="Return the dataset related content: eg. thumbnail image",
        responses={
            200: "Dataset related content successfully retrieved",
            404: "Dataset related content not found",
        },
    )
    @decorators.use_kwargs({"type": fields.Str(required=True)}, location="query")
    @decorators.cache(timeout=0)
    def get(self, dataset_id: str, type: str) -> Response:
        log.debug("Get {} for dataset <{}>", type, dataset_id)
        try:
            dds = broker.get_instance()
            content_filename = None
            try:
                content_filename = dds.get_dataset_content_filename(dataset_id, type)
            except LookupError:
                log.debug("Dataset <{}> NOT managed locally", dataset_id)
                try:
                    cat_ext = CatalogExt(path=CATALOG_EXT_DIR)
                    content_filename = cat_ext.get_dataset_content_filename(
                        dataset_id, type
                    )
                except ValueError:
                    # for missing or invalid cat_ext
                    pass
            if not content_filename:
                raise Warning(
                    f"Content <{type}> NOT configured for dataset <{dataset_id}>"
                )
            # expected content in folder with the same type name
            content = CATALOG_DIR.joinpath(f"{type}s", content_filename)
            if not content.exists():
                raise LookupError(
                    f"Content file <{content_filename}> NOT found for dataset <{dataset_id}>"
                )
            return send_from_directory(content.parent, content.name)
        except (LookupError, Warning) as e:
            raise NotFound(str(e), is_warning=isinstance(e, Warning))
