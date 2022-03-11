import datetime
import pathlib
from typing import Any, Dict, List, Optional

from celery import states
from celery.app.task import Task
from celery.exceptions import Ignore
from highlander.connectors import broker
from highlander.exceptions import (
    AccessToDatasetDenied,
    DiskQuotaException,
    EmptyOutputFile,
)
from highlander.models.sqlalchemy import Request
from restapi.connectors import sqlalchemy
from restapi.connectors.celery import CeleryExt
from restapi.utilities.logs import log
from sqlalchemy.sql import func


def handle_exception(request: Optional[Request], error_msg: str) -> None:
    if request:
        request.status = states.FAILURE
        request.error_message = error_msg


def human_size(
    bytes: int, units: List[str] = [" bytes", "KB", "MB", "GB", "TB", "PB", "EB"]
) -> str:
    """Returns a human readable string representation of bytes
    :rtype: string
    """
    return str(bytes) + units[0] if bytes < 1024 else human_size(bytes >> 10, units[1:])


@CeleryExt.task(idempotent=True)
def extract_data(
    self: Task,
    user_id: int,
    dataset_name: str,
    req_body: Dict[str, Any],
    request_id: int,
) -> None:
    log.info("Start task [{}:{}]", self.request.id, self.name)
    log.debug("Data Extraction: Dataset<{}> UserID<{}>", dataset_name, user_id)
    request = None
    try:
        db = sqlalchemy.get_instance()
        # load request by id
        request = db.Request.query.get(request_id)
        if not request:
            raise ReferenceError(
                f"Cannot find request reference for task {self.request.id}"
            )

        dds = broker.get_instance()

        # check the size estimate to avoid exceeding the user quota
        data_size_estimate = dds.broker.estimate_size(
            dataset_name=dataset_name, request=req_body.copy()
        )
        log.debug("DATA SIZE ESTIMATE: {}", data_size_estimate)
        user_quota = db.session.query(db.User.disk_quota).filter_by(id=user_id).scalar()  # type: ignore
        log.debug("USER QUOTA for user<{}>: {}", user_id, user_quota)
        used_quota = (
            db.session.query(func.sum(db.OutputFile.size).label("total_used"))
            .join(db.Request)  # type: ignore
            .filter(db.Request.user_id == user_id, db.OutputFile.size is not None)
            .all()[0][0]
            or 0
        )
        log.debug("USED QUOTA: {}", used_quota)
        if used_quota + data_size_estimate > user_quota:
            free_space = max(user_quota - used_quota, 0)
            # save error message in db
            message = (
                "Disk quota exceeded: required size {}; remaining space {}".format(
                    human_size(data_size_estimate), human_size(free_space)
                )
            )
            raise DiskQuotaException(message)

        log.debug(req_body)
        # run data extraction
        result_path = dds.broker.retrieve(
            dataset_name=dataset_name, request=req_body.copy()
        )

        log.debug("data result_path: {}", result_path)

        # update request status
        request.status = states.SUCCESS

        # create output_file record in db
        r = pathlib.Path(result_path)
        data_size = r.stat().st_size

        timestamp = None
        if r.parent.name != "download":
            timestamp = r.parent.name

        filename = r.name
        output_file = db.OutputFile(
            request_id=request_id,
            filename=filename,
            timestamp=timestamp,
            size=data_size,
        )
        db.session.add(output_file)

    except (DiskQuotaException, AccessToDatasetDenied, EmptyOutputFile) as exc:
        handle_exception(request, error_msg=str(exc))
        raise Ignore(str(exc))
    except Exception as exc:
        handle_exception(request, error_msg=f"Failed to extract data: {str(exc)}")
        raise exc
    finally:
        if request:
            request.end_date = datetime.datetime.utcnow()
            db.session.commit()
