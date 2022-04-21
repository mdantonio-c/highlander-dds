from datetime import datetime, timedelta
from ftplib import all_errors, error_perm
from pathlib import Path

from celery import states
from celery.app.task import Task
from celery.exceptions import Ignore
from restapi.connectors import ftp
from restapi.connectors.celery import CeleryExt
from restapi.env import Env
from restapi.utilities.logs import log

DATASET_DIR = Env.get("DATASETS_DIR", "/catalog/datasets") + "/crop-water"
CROP_WATER_AREAS = ["C4", "C5", "C7"]
ALLOWED_FORMATS = (".nc",)  # other existing formats are: .dbf .prj .shp .shx .cpg


@CeleryExt.task(idempotent=True, autoretry_for=(ConnectionResetError, OSError))
def retrieve_crop_water(self: Task, mirror: bool = False) -> None:
    """
    Retrieve the latest 'crop-water' forecast data from an FTP server.
    Updated weekly every Tuesday.

    Specifying the mirror mode allows to retrieve all data.

    For each area of interest the target directory is composed as follows:
    /{USER}/{AREA}/{YEAR}/monthlyForecast/{YY}-{MM}-{DD}

        parameters:
            mirror (bool): Enable data mirroring into local directory. Default false.
    """
    if mirror:
        try:
            with ftp.get_instance() as f:
                root_dir = f.connection.pwd()
                for area in CROP_WATER_AREAS:
                    log.info(f"Mirroring data for area <{area}>")
                    try:
                        f.connection.cwd(f"{root_dir}/{area}")
                    except all_errors:
                        log.warning(f"Cannot find expected folder area <{area}>")
                        continue
                    years = f.connection.nlst()
                    for year in years:
                        log.info(f"folder year: {year}")
                        try:
                            datetime.strptime(year, "%Y")
                            f.connection.cwd(f"{root_dir}/{area}/{year}")
                            files = f.connection.nlst()
                            # check if monthlyForecast exist
                            monthly_forecast = next(
                                i for i in files if i == "monthlyForecast"
                            )
                            f.connection.cwd(monthly_forecast)

                            # for each weekly forecast folder
                            weekly_folders = f.connection.nlst()
                            for ref_time in weekly_folders:
                                log.debug(ref_time)
                                try:
                                    # check if ref_time is the expected folder
                                    datetime.strptime(ref_time, "%Y-%m-%d")
                                    # check for valid dir
                                    f.connection.cwd(
                                        f"{root_dir}/{area}/{year}/monthlyForecast/{ref_time}"
                                    )
                                    relative_path = (
                                        f"{area}/{year}/monthlyForecast/{ref_time}"
                                    )
                                    local_path = Path(DATASET_DIR, relative_path)
                                    # make directories if they don't exist
                                    local_path.mkdir(parents=True, exist_ok=True)
                                    filenames = f.connection.nlst()
                                    # save only allowed formats
                                    for filename in [
                                        x
                                        for x in filenames
                                        if x.lower().endswith(ALLOWED_FORMATS)
                                    ]:
                                        file_to_save = local_path.joinpath(filename)
                                        if (
                                            file_to_save.exists()
                                            and file_to_save.stat().st_size
                                            == f.connection.size(filename)
                                        ):
                                            log.debug(
                                                f"SKIP: local path {file_to_save} already exists"
                                            )
                                            continue
                                        log.debug(
                                            f"Save <{filename}> file to: {local_path}"
                                        )
                                        # Write file in binary mode
                                        with open(file_to_save, "wb") as file:
                                            # Command for Downloading the file "RETR filename"
                                            f.connection.retrbinary(
                                                f"RETR {filename}", file.write
                                            )
                                except ValueError:
                                    log.warning(
                                        "Incorrect date format, should be YYYY-MM-DD"
                                    )
                                    continue
                                except all_errors as err:
                                    log.warning(f"Error with ftp: {err}")
                                    continue
                        except ValueError:
                            log.warning("Incorrect date format, should be YYYY")
                            continue
                        except StopIteration:
                            log.warning(f"No monthlyForecast found for year {year}")
                        except all_errors as err:
                            log.warning(f"Error with ftp: {err}")
                            continue

        except all_errors as err:
            log.error(f"Failure mirroring data: {err}")
            raise err
        return

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
            local_path = Path(DATASET_DIR, relative_path)
            # make directories if they don't exist
            local_path.mkdir(parents=True, exist_ok=True)
            # do not retrieve data if local already contains some
            if not not any(local_path.iterdir()):
                log.warning(f"SKIP: local path {local_path} already contains files")
                continue
            if len(filenames) == 0:
                log.warning(f"SKIP: no files available from server for area {area}")
                continue
            saved = 0
            for filename in filenames:
                file_to_save = local_path.joinpath(filename)
                log.debug(f"Save <{filename}> file to: {local_path}")
                # Write file in binary mode
                with open(file_to_save, "wb") as file:
                    # Command for Downloading the file "RETR filename"
                    f.connection.retrbinary(f"RETR {filename}", file.write)
                    saved += 1
            log.info(
                f"Download completed. Total file retrieved for area {area}: {saved}"
            )

        log.info(f"Retrieve crop-water {ref_time} completed")
