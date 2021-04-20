from typing import Any, List

from dds_backend import DataBroker
from restapi import decorators
from restapi.rest.definition import EndpointResource, Response

# from restapi.utilities.logs import log

broker = DataBroker(
    catalog_path="/catalog/catalog.yaml",  # Place where catalog YAML file is located
    cache_dir="/catalog/cache",  # Directory where cache files should be stored
    cache_details=True,  # If details should be cached as well
    storage="/catalog/download",  # Directory where retrieved data are persisted
    log_path="/catalog/logs",  # Directory where logs should be saved
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
        datasets: List[Any] = broker.list_datasets()

        # TODO retrieve all available datasets
        return self.response(datasets)
