from flask import send_from_directory
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
from sqlalchemy.orm import joinedload


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
        user = self.get_user()
        db = sqlalchemy.get_instance()
        if get_total:
            counter = db.Request.query.filter_by(user_id=user.id).count()
            return self.pagination_total(counter)

        log.debug("paging: page {0}, size {1}", page, size)
        data = []
        requests = (
            db.Request.query.filter_by(user_id=user.id)
            .options(joinedload(db.Request.output_file))
            .order_by(db.Request.submission_date.desc())
            .paginate(page, size, False)
            .items
        )
        log.debug(requests)
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
        user = self.get_user()
        c = celery.get_instance()
        req = {
            "product_type": "VHR-REA_IT_1989_2020_hourly",
            "variable": ["air_temperature", "precipitation_amount"],
            "latitude": {"start": 39, "stop": 40},
            "longitude": {"start": 16, "stop": 16.5},
            "time": {"year": 1991, "month": 1, "day": 1, "hour": 12},
        }
        task = c.celery_app.send_task("extract_data", args=[user.id, dataset_name, req])
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


class DownloadData(EndpointResource):
    @decorators.auth.require()
    @decorators.endpoint(
        path="/download/<filename>",
        summary="Download output file",
        responses={200: "File successfully downloaded", 404: "File not found"},
    )
    def get(self, filename):
        # user = self.get_user()
        # db = sqlalchemy.get_instance()

        # TODO check if user owns the file

        # TODO retrieve the file via broker connector

        # download the file as a response attachment
        # return send_from_directory(file_dir, filename, as_attachment=True)
        pass
