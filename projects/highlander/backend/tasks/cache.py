from pathlib import Path
from typing import List, Set

from celery.app.task import Task
from highlander.connectors import broker
from restapi.connectors.celery import CeleryExt
from restapi.env import Env
from restapi.utilities.logs import log


@CeleryExt.task(idempotent=True)
def clean_cache(self: Task, apply_to: List[str] = []) -> None:
    """
    Procedure for automatic cache cleaning.

    @param self: reference to this task
    @param apply_to: Optional list of dataset products in the form of {dataset}_{product}
    """
    log.info("clean cache for datasets: {}", apply_to or "ALL")

    cache_path = Path(Env.get("CACHE_PATH", "/catalog/cache"))
    log.debug("CACHE PATH: {}", cache_path)
    if not cache_path.is_dir():
        raise OSError("Invalid CACHE_PATH config: {}", cache_path)
    # use list of unique elements as a dataset can contain multiple products
    to_be_updated: Set[str] = set()
    if len(apply_to) == 0:
        apply_to = [x.stem for x in Path(cache_path).glob("**/*.cache")]
    # iterate over .cache files
    paths: List[Path] = []
    for d in apply_to:
        cache_file = Path(cache_path, f"{d}.cache")
        if not cache_file.exists():
            log.warning(f"Dataset <{d}>: .cache file NOT FOUND in {cache_file}")
            continue
        paths.append(cache_file)
        to_be_updated.add(d.split("_")[0])

    if not to_be_updated:
        log.info("Nothing to be updated.")
        return

    # remove cache file(s)
    for path in paths:
        path.unlink()
        log.debug("Removed cache file: {}", path.name)

    dds = broker.get_instance()
    log.debug("Update cache for dataset(s): {}", to_be_updated)
    existing_datasets = list(dds.broker.list_datasets())
    for ds in to_be_updated:
        # check for a valid dataset
        if ds not in existing_datasets:
            log.warning(f"Dataset <{ds}> NOT FOUND")
            continue
        # This does the trick! It could take a while for large datasets
        dds.broker.get_details(ds)

    log.info("Cache updated successfully")
