"""
DDS Broker connector
"""
from typing import Any, Optional, Union

from dds_backend import DataBroker
from restapi.connectors import Connector
from restapi.exceptions import ServiceUnavailable
from restapi.utilities.logs import log


class BrokerExt(Connector):
    broker: Any

    def __init__(self):
        super().__init__()
        log.debug(self.variables)

    def get_connection_exception(self):
        return (
            NotImplementedError,
            ServiceUnavailable,
            AttributeError,
            FileNotFoundError,
        )

    def connect(self, **kwargs):
        catalog_dir = self.variables.get("catalog_dir", "/catalog")
        self.broker = DataBroker(
            catalog_path=f"{catalog_dir}/catalog.yaml",  # Place where catalog YAML file is located
            cache_dir=f"{catalog_dir}/cache",  # Directory where cache files should be stored
            cache_details=True,  # If details should be cached as well
            storage=f"{catalog_dir}/download",  # Directory where retrieved data are persisted
            log_path=f"{catalog_dir}/logs",  # Directory where logs should be saved
        )
        return self

    def disconnect(self):
        self.disconnected = True

    def is_connected(self):
        return not self.disconnected


instance = BrokerExt()


def get_instance(
    verification: Optional[int] = None,
    expiration: Optional[int] = None,
    **kwargs: Union[Optional[str], int],
) -> "BrokerExt":

    return instance.get_instance(
        verification=verification, expiration=expiration, **kwargs
    )
