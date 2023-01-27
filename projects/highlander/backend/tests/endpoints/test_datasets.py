import time
from pathlib import Path
from typing import Any, List

from highlander.connectors import broker
from highlander.constants import CACHE_DIR
from highlander.tests import TestParams as params
from highlander.tests import invalidate_dataset_cache
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log

__author__ = "Giuseppe Trotta (g.trotta@cineca.it)"


class TestApp(BaseTests):
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

        invalidate_dataset_cache()

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
        invalidate_dataset_cache()

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
        invalidate_dataset_cache()

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
        r = client.get(f"{API_URI}/datasets/{params.DATASET_VHR}")
        assert r.status_code == 200

    def test_get_dataset_product(self, client: FlaskClient) -> None:
        # expected VHR-REA_IT_1989_2020_hourly product in test data
        r = client.get(
            f"{API_URI}/datasets/{params.DATASET_VHR}/products/{params.PRODUCT_VHR}"
        )
        assert r.status_code == 200

    def test_get_dataset_image(self, client: FlaskClient) -> None:
        r = client.get(f"{API_URI}/datasets")
        datasets = self.get_content(r)
        assert isinstance(datasets, list)
        # iterates over each dataset
        for ds in datasets:
            client.get(f"{API_URI}/datasets/{ds['id']}/content?type=image")
            assert r.status_code in [200, 404]
