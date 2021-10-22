from pathlib import Path

from restapi.env import Env

CATALOG_DIR = Path(Env.get("CATALOG_DIR", "/catalog"))  # type: ignore
DOWNLOAD_DIR = CATALOG_DIR.joinpath("download")
