from pathlib import Path
from typing import List, Set

from highlander.connectors import broker
from highlander.constants import CACHE_DIR
from restapi.connectors.celery import CeleryExt, Task
from restapi.utilities.logs import log


@CeleryExt.task(idempotent=True)
def clean_cache(self: Task[[List[str]], None], apply_to: List[str] = []) -> None:
    """
    Procedure for automatic cache cleaning.

    @param self: reference to this task
    @param apply_to: Optional list of dataset products in the form of {dataset}_{product}
    """
    log.info("clean cache for datasets: {}", apply_to or "ALL")

    log.debug("CACHE PATH: {}", CACHE_DIR)
    if not CACHE_DIR.is_dir():
        raise OSError("Invalid CACHE_PATH config: {}", CACHE_DIR)
    # use list of unique elements as a dataset can contain multiple products
    to_be_updated: Set[str] = set()
    if len(apply_to) == 0:
        apply_to = [x.stem for x in CACHE_DIR.glob("**/*.cache")]
    # iterate over .cache files
    paths: List[Path] = []
    for d in apply_to:
        cache_file = Path(CACHE_DIR, f"{d}.cache")
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
        log.info("Removed cache file: {}", path.name)

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
