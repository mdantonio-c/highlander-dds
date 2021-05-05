import os
from typing import Any, Dict, List

import dds_backend.core.base.ex as ex
from dds_backend import DataBroker
from restapi import decorators
from restapi.exceptions import NotFound, ServiceUnavailable
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log

CATALOG_DIR = os.environ.get("CATALOG_DIR", "/catalog")
broker = DataBroker(
    catalog_path=f"{CATALOG_DIR}/catalog.yaml",  # Place where catalog YAML file is located
    cache_dir=f"{CATALOG_DIR}/cache",  # Directory where cache files should be stored
    cache_details=True,  # If details should be cached as well
    storage=f"{CATALOG_DIR}/download",  # Directory where retrieved data are persisted
    log_path=f"{CATALOG_DIR}/logs",  # Directory where logs should be saved
)


class Datasets(EndpointResource):
    @decorators.endpoint(
        path="/datasets",
        summary="Get datasets",
        description="Return all available datasets",
        responses={
            200: "Datasets successfully retrieved",
        },
    )
    def get(self) -> Response:
        # get the list of datasets
        datasets: List[Any] = []
        for ds in broker.list_datasets():
            log.debug("get details for dataset <{}>", ds)
            details = broker.get_details(ds)
            datasets.append(to_response(ds, details))
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
    def get(self, dataset_name: str) -> Response:
        log.debug("Get dataset <{}>", dataset_name)
        try:
            details = broker.get_details(dataset_name)
        except ex.DMSKeyError as e:
            raise NotFound(str(e)[1:-1])
        return self.response(to_response(dataset_name, details))


def to_response(dataset_name, details):
    meta = details.get("dataset_info")
    meta["name"] = dataset_name
    return meta
