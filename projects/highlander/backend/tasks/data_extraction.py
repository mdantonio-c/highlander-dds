import datetime
import pathlib

from celery import states
from celery.exceptions import Ignore
from highlander.connectors import broker
from highlander.exceptions import (
    AccessToDatasetDenied,
    DiskQuotaException,
    EmptyOutputFile,
)
from restapi.connectors import sqlalchemy
from restapi.connectors.celery import CeleryExt
from restapi.utilities.logs import log


def handle_exception(task, request, exc, ignore=False, error_msg=None):
    request.status = states.FAILURE
    request.error_message = error_msg or str(exc)
    # manually update the task state
    task.update_state(state=states.FAILURE, meta=exc)
    if ignore:
        log.warning(exc)
        raise Ignore()
    else:
        log.exception("{}: {}", error_msg, repr(exc))
        raise exc


@CeleryExt.task()
def extract_data(self, user_id, dataset_name, req_body, request_id):
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
