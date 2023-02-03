import json
import shutil
from typing import Any, Dict, List, Mapping, Optional, Union, cast

from highlander.connectors import broker
from highlander.constants import DOWNLOAD_DIR
from highlander.models.schemas import DataExtraction
from restapi import decorators
from restapi.connectors import celery, sqlalchemy
from restapi.exceptions import NotFound, ServerError, Unauthorized
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import User
from restapi.services.download import Downloader
from restapi.utilities.logs import log
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.exc import NoResultFound

RequestArgs = Union[str, List[str], Dict[str, List[str]]]


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
    def get(
        self,
        get_total: bool,
        page: int,
        size: int,
        sort_order: str,
        sort_by: str,
        input_filter: str,
        user: User,
    ) -> Response:

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
            if r.error_message:
                item["error_message"] = r.error_message
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
    def post(self, dataset_name: str, user: User, **kwargs: RequestArgs) -> Response:
        c = celery.get_instance()
        log.debug("Request for extraction for <{}>", dataset_name)
        args = build_request_args(**kwargs)

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
    def get(self, request_id: str, user: User) -> Response:
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
    def delete(self, request_id: str, user: User) -> Response:
        log.debug("delete request {}", request_id)
        db = sqlalchemy.get_instance()
        # check if the request exists
        req = db.Request.query.get(int(request_id))
        if not req:
            raise NotFound(f"Request ID<{request_id}> NOT found")

        # check if the user owns the request
        if req.user_id != user.id:
            raise Unauthorized("Unauthorized request")

        output_file = req.output_file
        if output_file:
            try:
                db.session.delete(output_file)  # type: ignore
                if output_file.timestamp:
                    filepath = DOWNLOAD_DIR.joinpath(output_file.timestamp)
                    shutil.rmtree(filepath)
                else:
                    filepath = DOWNLOAD_DIR.joinpath(output_file.filename)
                    filepath.unlink()
            except FileNotFoundError as error:
                # silently pass when file is not found
                log.warning(error)
        db.session.delete(req)  # type: ignore
        db.session.commit()
        return self.response(f"Request ID<{request_id}> successfully removed")


class DownloadData(EndpointResource):
    @decorators.auth.require(allow_access_token_parameter=True)
    @decorators.endpoint(
        path="/download/<timestamp>",
        summary="Download output file",
        responses={
            200: "File successfully downloaded",
            401: "Unauthorized request",
            404: "File not found",
        },
    )
    def get(self, timestamp: str, user: User) -> Response:

        db = sqlalchemy.get_instance()
        try:
            output_file = (
                db.session.query(db.OutputFile)
                .filter(
                    or_(
                        db.OutputFile.timestamp == timestamp,
                        db.OutputFile.filename == f"{timestamp}.zip",
                    )
                )
                .one()
            )
            # check if user owns the file
            if output_file.request.user_id != user.id:
                raise Unauthorized("Unauthorized request")
            file_dir = DOWNLOAD_DIR
            if output_file.timestamp:
                file_dir = DOWNLOAD_DIR.joinpath(output_file.timestamp)
            file_path = file_dir.joinpath(output_file.filename)
            if not file_path.exists():
                log.error(
                    f"Expected filename <{output_file.filename}> in the path {file_dir}"
                )
                raise FileNotFoundError()
            return Downloader.send_file_streamed(
                file_path.name, subfolder=file_path.parent
            )
        except (NoResultFound, FileNotFoundError):
            raise NotFound(f"OutputFile with TIMESTAMP<{timestamp}> NOT found")


class EstimateSize(EndpointResource):
    labels = ["estimate-size"]

    @decorators.auth.require()
    @decorators.use_kwargs(DataExtraction)
    @decorators.endpoint(
        path="/estimate-size/<dataset_name>",
        summary="Estimate request size",
        responses={200: "Estimated size", 404: "Dataset does not exist"},
    )
    def post(self, dataset_name: str, user: User, **kwargs: RequestArgs) -> Response:
        log.debug(f"Estimate size for dataset <{dataset_name}>")
        args = build_request_args(**kwargs)
        log.debug(f"request: {args}")

        dds = broker.get_instance()
        if dataset_name not in dds.get_datasets([dataset_name]):
            raise NotFound(f"Dataset <{dataset_name}> does not exist")
        try:
            estimated_size = dds.estimate_size_check(
                dataset_name=dataset_name, request=args
            )
        except Exception as e:
            raise ServerError(f"Unable to get size estimation: {e}")
        return self.response(estimated_size)


def build_request_args(**kwargs: RequestArgs) -> Mapping[str, Any]:
    payload = kwargs.copy()
    log.debug(json.dumps(payload, indent=2, sort_keys=True))

    product: str = cast(str, kwargs.pop("product_type"))
    variable: List[str] = cast(List[str], kwargs.pop("variable", []))
    time: Optional[Dict[str, List[str]]] = cast(
        Optional[Dict[str, List[str]]], kwargs.pop("time", None)
    )
    format_: str = cast(str, kwargs.pop("format"))
    latitude: Optional[Dict[str, float]] = cast(
        Optional[Dict[str, float]], kwargs.pop("latitude", None)
    )
    longitude: Optional[Dict[str, float]] = cast(
        Optional[Dict[str, float]], kwargs.pop("longitude", None)
    )
    area: Optional[Dict[str, float]] = cast(
        Optional[Dict[str, float]], kwargs.pop("area", None)
    )
    extra: Optional[Dict[str, Any]] = cast(
        Optional[Dict[str, Any]], kwargs.pop("extra", None)
    )
    args: Dict[str, Any] = {
        "product_type": product,
        "format": format_,
    }
    if variable:
        args["variable"] = variable
    if time:
        args["time"] = time
    if latitude:
        args["latitude"] = latitude
    if longitude:
        args["longitude"] = longitude
    if area:
        args["area"] = area
    if extra:
        for k, v in extra.items():
            args[k] = v
    return args
