from restapi.connectors.celery import CeleryExt
from restapi.utilities.logs import log


@CeleryExt.task()
def data_extract(self):
    log.info("Start task [{}:{}]", self.request.id, self.name)
