import datetime
import pathlib
from typing import Any, Dict, Optional

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


def handle_exception(
    task: Task,
    request: Request,
    exc: Exception,
    ignore: bool = False,
    error_msg: Optional[str] = None,
) -> None:
    request.status = states.FAILURE
    request.error_message = error_msg or str(exc)
    # manually update the task state
    task.update_state(state=states.FAILURE, meta={"error": str(exc)})
    if ignore:
        log.warning(exc)
        raise Ignore()
    else:
        log.exception("{}: {}", error_msg, repr(exc))
        raise exc


@CeleryExt.task()
def extract_data(
    self: Task,
    user_id: int,
    dataset_name: str,
    req_body: Dict[str, Any],
    request_id: int,
) -> None:
    log.info("Start task [{}:{}]", self.request.id, self.name)
    log.debug("Data Extraction: Dataset<{}> UserID<{}>", dataset_name, user_id)
    try:
        db = sqlalchemy.get_instance()
        # load request by id
        request = db.Request.query.get(request_id)
        if not request:
            raise ReferenceError(
                f"Cannot find request reference for task {self.request.id}"
            )

        dds = broker.get_instance()
        result_path = dds.broker.retrieve(dataset_name=dataset_name, request=req_body)
        log.debug("data result_path: {}", result_path)

        # update request status
        request.status = states.SUCCESS

        # create output_file record in db
        data_size = pathlib.Path(result_path).stat().st_size
        r = pathlib.Path(result_path)
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
        handle_exception(self, request, exc, ignore=True)
    except Exception as exc:
        handle_exception(self, request, exc, error_msg="Failed to extract data")
    finally:
        if request:
            request.end_date = datetime.datetime.utcnow()
            db.session.commit()
