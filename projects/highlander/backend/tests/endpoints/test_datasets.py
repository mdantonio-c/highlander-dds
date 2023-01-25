import time
from pathlib import Path
from typing import Any, List

from highlander.connectors import broker
from highlander.constants import CACHE_DIR
from restapi.server import create_app
from restapi.services.cache import Cache
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log
from restapi.utilities.meta import Meta

__author__ = "Giuseppe Trotta (g.trotta@cineca.it)"
DATASET_VHR = "era5-downscaled-over-italy"
PRODUCT_VHR = "VHR-REA_IT_1981_2020_hourly"


class TestApp(BaseTests):
    def invalidate_dataset_cache(self):
        # invalidate the endpoint cache
        create_app(name="Cache clearing")
        Datasets = Meta.get_class("endpoints.datasets", "Datasets")
        Cache.invalidate(Datasets.get)
        log.info("CACHE INVALIDATED")

    def test_get_datasets(self, client: FlaskClient) -> None:
        # tests if dataset without cache are discarded
        # check if dds cache exist
        if CACHE_DIR.is_dir():
            cache_files = [x for x in CACHE_DIR.glob("**/*.cache")]
            if cache_files:
                # delete all cache files
                for f in cache_files:
                    path = Path(CACHE_DIR, f)
                    path.unlink()

        self.invalidate_dataset_cache()

        """Expected empty dataset catalog (get datasets before creating the cache)"""
        r = client.get(f"{API_URI}/datasets")
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert len(response_data) == 0

        # manually create the dds cache
        dds = broker.get_instance()
        dataset_to_cache = dds.get_uncached_datasets()
        for d in dataset_to_cache:
            log.info(f"getting details for {d}")
            dds.broker.get_details(d)
            break
        # invalidate the endpoint cache
        create_app(name="Cache clearing")
        Datasets = Meta.get_class("endpoints.datasets", "Datasets")
        Cache.invalidate(Datasets.get)

        """Expected no empty dataset catalog"""
        r = client.get(f"{API_URI}/datasets")
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert isinstance(response_data, list)
        assert len(response_data) == 1

        time.sleep(1)

        # manually create the dds cache
        dds = broker.get_instance()
        dataset_to_cache = dds.get_uncached_datasets()
        for d in dataset_to_cache:
            log.info(f"getting details for {d}")
            dds.broker.get_details(d)
        # invalidate the endpoint cache
        create_app(name="Cache clearing")
        Datasets = Meta.get_class("endpoints.datasets", "Datasets")
        Cache.invalidate(Datasets.get)

        """Expected no empty dataset catalog"""
        r = client.get(f"{API_URI}/datasets")
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert isinstance(response_data, list)
        assert len(response_data) > 1

    def test_get_applications(self, client: FlaskClient) -> None:
        r = client.get(f"{API_URI}/datasets?application=true")
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert isinstance(response_data, list)
        # check application flag
        for ds in response_data:
            assert ds.get("application", False)

    def test_get_dataset(self, client: FlaskClient) -> None:
        # expected era5-downscaled-over-italy dataset in test data
        r = client.get(f"{API_URI}/datasets/{DATASET_VHR}")
        assert r.status_code == 200

    def test_get_dataset_product(self, client: FlaskClient) -> None:
        # expected VHR-REA_IT_1989_2020_hourly product in test data
        r = client.get(f"{API_URI}/datasets/{DATASET_VHR}/products/{PRODUCT_VHR}")
        assert r.status_code == 200

    def test_get_dataset_image(self, client: FlaskClient) -> None:
        r = client.get(f"{API_URI}/datasets")
        datasets = self.get_content(r)
        assert isinstance(datasets, list)
        # iterates over each dataset
        for ds in datasets:
            client.get(f"{API_URI}/datasets/{ds['id']}/content?type=image")
            assert r.status_code in [200, 404]
