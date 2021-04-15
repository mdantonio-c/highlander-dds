from typing import Any, List

from restapi import decorators
from restapi.rest.definition import EndpointResource, Response

# from restapi.utilities.logs import log


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
        datasets: List[Any] = []
        # TODO retrieve all available datasets
        return self.response(datasets)
