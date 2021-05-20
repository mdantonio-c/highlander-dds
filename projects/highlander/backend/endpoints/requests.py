from highlander.models.schemas import DataExtraction
from restapi import decorators
from restapi.connectors import celery, sqlalchemy
from restapi.exceptions import (
    BadRequest,
    Forbidden,
    NotFound,
    ServerError,
    ServiceUnavailable,
    Unauthorized,
)
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log


class Requests(EndpointResource):
    labels = ["requests"]

    @decorators.auth.require()
    @decorators.get_pagination
    @decorators.endpoint(
        path="/requests",
        summary="Get submitted job requests",
        responses={
            200: "List of submitted user requests",
            404: "No request found",
        },
    )
    def get(self, get_total, page, size, sort_order, sort_by, input_filter):
        # user = self.get_user()
        # db = sqlalchemy.get_instance()

        log.debug("paging: page {0}, size {1}", page, size)
        data = []
        # TODO
        return self.response(data)

    @decorators.auth.require()
    @decorators.use_kwargs(DataExtraction)
    @decorators.endpoint(
        path="/requests/<dataset_name>",
        summary="Submit a data extraction request for a specific dataset",
        responses={
            202: "Data extraction request accepted",
            400: "Invalid request",
        },
    )
    def post(self, dataset_name):
        # TODO
        c = celery.get_instance()
        task = c.celery_app.send_task("data_extract", args=[])
        log.debug("Request submitted")
        return self.response(task.id, code=202)


class Request(EndpointResource):
    labels = ["request"]

    @decorators.auth.require()
    @decorators.endpoint(
        path="/requests/<request_id>",
        summary="Get a request by id",
        responses={
            200: "Request successfully retrieved",
            404: "Request does not exist",
        },
    )
    @decorators.marshal_with(DataExtraction, code=200)
    def get(self, request_id: str) -> Response:
        log.debug("Get request <{}>", request_id)
        data_query = None
        try:
            pass
            # TODO
        except BaseException as e:
            raise NotFound(str(e))
        return self.response(data_query)

    @decorators.auth.require()
    @decorators.endpoint(
        path="/requests/<request_id>",
        summary="Delete a request",
        responses={
            200: "Request deleted successfully.",
            404: "Request does not exist.",
        },
    )
    def delete(self, request_id):
        log.debug("delete request {}", request_id)
        # TODO
        pass
