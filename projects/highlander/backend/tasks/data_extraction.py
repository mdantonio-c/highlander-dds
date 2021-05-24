import os

from dds_backend import DataBroker
from restapi.connectors.celery import CeleryExt
from restapi.utilities.logs import log

CATALOG_DIR = os.environ.get("CATALOG_DIR", "/catalog")
broker = DataBroker(
    catalog_path=f"{CATALOG_DIR}/catalog.yaml",  # Place where catalog YAML file is located
    cache_dir=f"{CATALOG_DIR}/cache",  # Directory where cache files should be stored
    cache_details=True,  # If details should be cached as well
    storage=f"{CATALOG_DIR}/download",  # Directory where retrieved data are persisted
    log_path=f"{CATALOG_DIR}/logs",  # Directory where logs should be saved
)


@CeleryExt.task()
def extract_data(self, user_id, dataset_name, req):
    log.info("Start task [{}:{}]", self.request.id, self.name)
    log.debug("Data Extraction: Dataset<{}> UserID<{}>", dataset_name, user_id)

    broker.retrieve(dataset_name=dataset_name, request=req)
