from datetime import datetime
from pathlib import Path
from typing import Optional
from zipfile import ZipFile

import requests
from highlander.constants import DATASETS_DIR
from highlander.tasks.crop_water import CROP_WATER_AREAS
from restapi.connectors.celery import CeleryExt, Task
from restapi.env import Env
from restapi.utilities.logs import log


@CeleryExt.task(idempotent=True)
def generate_layers(self: Task[[str], None], ref_date: str):
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

    geo = Geoserver(service_url="http://geoserver.dockerized.io:8080/geoserver")

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
        # use geoserver rest API to create a shapefile store
        shp_store = f"{area}_monthlyForecast_{ref_date}"
        log.info(f"Creating SHP datastore <{shp_store}>")
        res = geo.create_shp_datastore(
            path=zip_file, store_name=shp_store, workspace="highlander"
        )
        log.info(res)

    log.info(f"Task <{self.name}, args='{ref_date}'> completed")


class Geoserver:
    def __init__(
        self,
        service_url: str = "http://localhost:8080/geoserver",
        username: str = Env.get("GEOSERVER_ADMIN_USER", "admin"),
        password: str = Env.get("GEOSERVER_ADMIN_PASSWORD", "geoserver"),
    ):
        self.service_url = service_url
        self.username = username
        self.password = password

    def create_shp_datastore(
        self,
        path: Path,
        store_name: Optional[str] = None,
        workspace: Optional[str] = None,
        file_extension: str = "shp",
    ):
        if path is None:
            raise Exception("You must provide a full path to shapefile")

        if workspace is None:
            workspace = "default"

        if store_name is None:
            store_name = path.stem

        headers = {"Content-type": "application/zip"}
        url = "{0}/rest/workspaces/{1}/datastores/{2}/file.{3}?filename={2}&update=overwrite".format(
            self.service_url, workspace, store_name, file_extension
        )
        with open(path, "rb") as f:
            r = requests.put(
                url,
                data=f.read(),
                auth=(self.username, self.password),
                headers=headers,
            )

            if r.status_code in [200, 201]:
                return "The shapefile datastore created successfully!"
            else:
                raise Exception(
                    f"{r.status_code}: The shapefile datastore can not be created! {r.content}"
                )
