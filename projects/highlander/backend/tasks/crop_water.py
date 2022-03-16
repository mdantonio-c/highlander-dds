from datetime import datetime, timedelta
from ftplib import error_perm
from pathlib import Path

from celery.app.task import Task
from restapi.connectors import ftp
from restapi.connectors.celery import CeleryExt
from restapi.env import Env
from restapi.utilities.logs import log

DATASET_DIR = Env.get("DATASETS_DIR", "/catalog/datasets") + "/crop-water"
CROP_WATER_AREAS = ["C4", "C5", "C7"]


@CeleryExt.task(idempotent=True)
def retrieve_data(self: Task):
    """
    Retrieve 'crop-water' data from a FTP server.
    They are forecast data updated weekly every Tuesday.

    For each area of interest the target directory is composed as follows:
    /{USER}/{AREA}/{YEAR}/monthlyForecast/{YY}-{MM}-{DD}
    """
    log.info("Retrieve data from FTP Server")
    with ftp.get_instance() as f:
        log.info("FTP server connected successfully")
        # suppress ftp debugging
        f.connection.debug(0)

        # get the last Tuesday
        today = datetime.utcnow()
        last_tuesday = today - timedelta(days=today.weekday() - 1)
        ref_time = last_tuesday.strftime("%Y-%m-%d")
        root_dir = f.connection.pwd()

        for area in CROP_WATER_AREAS:
            log.info(f"Retrieve data for area <{area}>")
            relative_path = f"{area}/{last_tuesday.year}/monthlyForecast/{ref_time}"
            try:
                f.connection.cwd(f"{root_dir}/{relative_path}")
            except error_perm as err:
                log.error(f"Failure retrieving data from area <{area}>: {err}")
                continue

            filenames = f.connection.nlst()
            local_path = Path(f"{DATASET_DIR}/{relative_path}")
            # make directories if they don't exist
            local_path.mkdir(parents=True, exist_ok=True)

            for filename in filenames:
                file_to_save = local_path.joinpath(filename)
                print(f"Save <{filename}> file to: {local_path}")
                # Write file in binary mode
                with open(file_to_save, "wb") as file:
                    # Command for Downloading the file "RETR filename"
                    f.connection.retrbinary(f"RETR {filename}", file.write)
