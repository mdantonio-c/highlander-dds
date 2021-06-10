import os

from highlander.connectors import broker
from restapi.connectors.celery import CeleryExt
from restapi.utilities.logs import log


@CeleryExt.task()
def extract_data(self, user_id, dataset_name, req):
    log.info("Start task [{}:{}]", self.request.id, self.name)
    log.debug("Data Extraction: Dataset<{}> UserID<{}>", dataset_name, user_id)

    dds = broker.get_instance()
    dds.broker.retrieve(dataset_name=dataset_name, request=req)
