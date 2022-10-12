import os.path
from typing import List

import yaml
from highlander.models.schemas import DatasetInfo
from marshmallow import ValidationError
from restapi.utilities.logs import log


class CatalogExt:
    """
    Class for DDS catalog extension
    """

    def __init__(self, path: str) -> None:
        self.path = path

    def get_datasets(self) -> List:
        res = []
        paths = []
        with open(self.path) as f:
            try:
                config = yaml.safe_load(f)
                sources = config.get("sources", {})
                for ds_name, value in sources.items():
                    ds_path = value.get("path")
                    if ds_path is None:
                        log.warning(f"Missing config 'path' for dataset <{ds_name}>")
                        continue
                    ds_path = os.path.expandvars(ds_path)
                    if not os.path.exists(ds_path):
                        log.warning(f"Invalid path: {ds_path}")
                        continue
                    paths.append(ds_path)
            except yaml.YAMLError as exc:
                log.error(exc)
                # FIXME (?)
        for path in paths:
            with open(path) as f:
                try:
                    ds_config = yaml.safe_load(f)
                    meta = ds_config.get("metadata")
                    if meta is None:
                        log.warning(f"Missing config 'metadata' in path <{path}>")
                        continue
                    # validate metadata
                    result = DatasetInfo().load(meta)
                    res.append(result)
                except yaml.YAMLError as exc:
                    log.error(exc)
                except ValidationError as exc:
                    log.error(exc.messages)
                    log.debug(exc.valid_data)
                except Exception as exc:
                    log.error(exc)
        return res
