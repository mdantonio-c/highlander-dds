from datetime import datetime
from pathlib import Path
from zipfile import ZipFile

from celery.app.task import Task
from highlander.constants import DATASETS_DIR
from highlander.tasks.crop_water import CROP_WATER_AREAS
from restapi.connectors.celery import CeleryExt
from restapi.utilities.logs import log


@CeleryExt.task(idempotent=True)
def generate_layers(self: Task, ref_date: str):
    """
    Task for automatic layer creation in GeoServer.

    @param self: reference to this task
    @param ref_date: Mandatory reference date YYYY-MM-DD
    """
    log.info(f"Generate layers in GeoServer <ref date: {ref_date}>")
    try:
        date_obj = datetime.strptime(ref_date, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Incorrect date format, should be YYYY-MM-DD")
    for area in CROP_WATER_AREAS:
        target_path = Path(
            DATASETS_DIR.joinpath("crop-water"),
            f"{area}/{date_obj.year}/monthlyForecast/{ref_date}",
        )
        if not target_path.is_dir():
            raise OSError("Not found path: {}", target_path)
        # create zipped shapefile
        zip_file = Path(target_path, f"{area}_monthlyForecast_{ref_date}.zip")
        if not zip_file.is_file():
            log.info(f"Create zip shapefile: {zip_file.name}")
            list_files = list(
                target_path.glob(f"**/{area}_monthlyForecast_{ref_date}.*")
            )
            log.debug([i.name for i in list_files])
            with ZipFile(zip_file, "w") as archive:
                for file_path in list_files:
                    archive.write(file_path, arcname=file_path.name)
        # TODO use geoserver rest API
