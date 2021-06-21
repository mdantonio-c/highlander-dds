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
        for r in requests:
            log.debug(r)
            item = {
                "id": r.id,
                "name": r.name,
                "dataset_name": r.dataset_name,
                "args": r.args,
                "submission_date": r.submission_date.isoformat(),
                "status": r.status,
                "task_id": r.task_id,
            }
            if r.end_date:
                item["end_date"] = r.end_date.isoformat()
            if r.output_file:
                item["output_file"] = {
                    "filename": r.output_file.filename,
                    "timestamp": r.output_file.timestamp,
                    "size": r.output_file.size,
                }
            data.append(item)
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
    def post(self, dataset_name, product, variables=[]):
        user = self.get_user()
        c = celery.get_instance()
        log.debug("Request for extraction for <{}>", dataset_name)
        log.debug("Variables: {}", variables)
        args = {"product_type": product}
        if variables:
            args["variable"] = variables
        task = None
        db = sqlalchemy.get_instance()
        try:
            # save request record in db
            request = db.Request(
                name="test",
                dataset_name=dataset_name,
                args=args,
                user_id=user.id,
                status="CREATED",
            )
            db.session.add(request)
            db.session.commit()

            task = c.celery_app.send_task(
                "extract_data", args=[user.id, dataset_name, args, request.id]
            )
            request.task_id = task.id
            request.status = task.status  # 'PENDING'
            db.session.commit()
            log.info("Request <ID:{}> successfully saved", request.id)
        except Exception as exc:
            log.exception(exc)
            db.session.rollback()
            raise ServerError("Unable to submit the request")

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
