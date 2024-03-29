import os
import time
from pathlib import Path

import pytest
from celery.result import AsyncResult
from faker import Faker
from flask import Flask
from highlander.constants import CACHE_DIR
from highlander.tests import TestParams as params
from highlander.tests import invalidate_dataset_cache
from restapi.connectors.celery import Ignore
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log


class TestApp(BaseTests):
    def test_endpoint_access(self, client: FlaskClient, faker: Faker) -> None:
        # create a fake user and login with it

        uuid, data = self.create_user(client, {"roles": ["normal_user"]})
        # Will be used to delete the user after the tests
        self.save("fake_uuid", uuid)
        user_header, _ = self.do_login(client, data.get("email"), data.get("password"))

        self.save("auth_header", user_header)

        endpoint = f"{API_URI}/admin/cache"
        r = client.post(endpoint, headers=user_header)
        # check response code
        assert r.status_code == 401
        # delete the newly created user
        uuid = self.get("fake_uuid")
        self.delete_user(client, uuid)

    def test_not_existing_dataset(
        self,
        client: FlaskClient,
        faker: Faker,
        app: Flask,
    ) -> None:
        # check if there is a cache dir and if not empty delete the content
        if not CACHE_DIR.is_dir():
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
        for f in CACHE_DIR.iterdir():
            if f.is_file():
                f.unlink()

        assert not any(CACHE_DIR.iterdir())
        admin_headers, _ = BaseTests.do_login(client, None, None)
        self.save("auth_header", admin_headers)
        headers = self.get("auth_header")
        endpoint = f"{API_URI}/admin/cache"
        fake_dataset = {"clean": True, "datasets": [faker.pystr()]}
        r = client.post(endpoint, json=fake_dataset, headers=headers)
        assert r.status_code == 404
        # try to create the cache for a dataset that does not exists
        self.send_task(app, "create_cache", [faker.pystr()])
        # check that no cache has been created
        assert not any(CACHE_DIR.iterdir())

    def test_cache_clean_with_empty_cache_dir(
        self, client: FlaskClient, faker: Faker, app: Flask
    ) -> None:
        # delete cache dir
        CACHE_DIR.rmdir()
        # check system error if cache dir does not exists
        with pytest.raises(
            Ignore, match=r"^(.*?(\bInvalid CACHE_PATH config\b)[^$]*)$"
        ):
            self.send_task(app, "clean_cache")
        # recreate the dir
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        # check clean with cache empty
        headers = self.get("auth_header")
        endpoint = f"{API_URI}/admin/cache"
        body = {"clean": True}
        r = client.post(endpoint, json=body, headers=headers)
        assert r.status_code == 202
        # check that no cache has been created
        assert not any(CACHE_DIR.iterdir())

        # check clean all with a cached datasets that does not exists
        # create a fake cache file
        fake_cache_filename = f"{faker.pystr()}_{faker.pystr()}.cache"
        open(Path(CACHE_DIR, fake_cache_filename), "w")
        # check the file exists
        assert any(CACHE_DIR.iterdir())
        r = client.post(endpoint, json=body, headers=headers)
        assert r.status_code == 202
        # wait the task to be fulfilled
        time.sleep(2)
        # check that the fake cache has been deleted
        assert not any(CACHE_DIR.iterdir())
        # check clean dataset which does not have a cache
        body["datasets"] = ["soil-erosion"]
        r = client.post(endpoint, json=body, headers=headers)
        assert r.status_code == 202
        # check that no cache has been created
        assert not any(CACHE_DIR.iterdir())

    def test_cache_create(self, client: FlaskClient, faker: Faker, app: Flask) -> None:
        # create a cache
        headers = self.get("auth_header")
        endpoint = f"{API_URI}/admin/cache"
        get_dataset_endpoint = f"{API_URI}/datasets"
        # clean dataset cache to have a clean response
        invalidate_dataset_cache()
        # check that cache files aren't created by get dataset endpoint
        r = client.get(get_dataset_endpoint)
        assert r.status_code == 200
        response_body = self.get_content(r)
        assert len(response_body) == 0
        r = client.post(endpoint, headers=headers)
        assert r.status_code == 202
        response_body = self.get_content(r)
        # wait the task to be fulfilled
        time.sleep(6)
        # check that the cache files has been created
        cache_files = [x for x in CACHE_DIR.iterdir() if "cache_conf" not in x.name]
        assert len(cache_files) == params.CACHE_FILE_NUMBER

        # # check that the datasets are seen by get dataset endpoint
        # # invalidate the cache
        invalidate_dataset_cache()
        # # wait the task to be fulfilled
        time.sleep(2)
        r = client.get(get_dataset_endpoint)
        assert r.status_code == 200
        response_body = self.get_content(r)
        assert len(response_body) == params.DATASETS_NUMBER
        # # check task is not relaunched if all datasets has a cache
        log.info(
            f"not api point of view -  Cache already present: {[[x for x in CACHE_DIR.iterdir()]]}"
        )
        r = client.post(endpoint, headers=headers)
        assert r.status_code == 200
        response_body = self.get_content(r)
        assert "Nothing to be done" in response_body

        # testing the cache creation directly with task
        last_mod_cache = [
            os.path.getmtime(x)
            for x in CACHE_DIR.iterdir()
            if "cache_conf" not in x.name
        ]

        # try to create a cache for datasets that already have a cache
        self.send_task(
            app,
            "create_cache",
            [
                "era5-downscaled-over-italy",
                "sub-seasonal",
                "soil-erosion",
                "human-wellbeing",
            ],
        )
        if_mod_chahe = [
            os.path.getmtime(x)
            for x in CACHE_DIR.iterdir()
            if "cache_conf" not in x.name
        ]
        assert last_mod_cache == if_mod_chahe

        # remove by hand three files from the cache
        rmvd_cache = [
            os.path.join(CACHE_DIR, "sub-seasonal_sub-seasonal.cache"),
            os.path.join(CACHE_DIR, "human-wellbeing_daily.cache"),
            os.path.join(CACHE_DIR, "soil-erosion_rainfall-erosivity.cache"),
        ]
        for f in rmvd_cache:
            os.unlink(f)

        # asking a single dataset to the endpoint
        dset_body = {"datasets": ["sub-seasonal"]}
        r = client.post(endpoint, json=dset_body, headers=headers)
        assert r.status_code == 202
        time.sleep(5)

        # checking that only for the requested dataset the cache file has been created
        assert os.path.isfile(rmvd_cache[0])
        assert not os.path.isfile(rmvd_cache[1])
        assert not os.path.isfile(rmvd_cache[2])

        # excluding a dataset in the request to the endpoint
        dset_body = {"exclude": ["soil-erosion"]}
        r = client.post(endpoint, json=dset_body, headers=headers)
        assert r.status_code == 202
        time.sleep(5)

        invalidate_dataset_cache()
        # check that cache files aren't created by get dataset endpoint
        r = client.get(get_dataset_endpoint)
        assert r.status_code == 200

        # checking that the excluded dataset doesn't have the cache file
        assert os.path.isfile(rmvd_cache[1])
        assert not os.path.isfile(rmvd_cache[2])

        # creation of the last dataset cache
        dset_body = {"datasets": ["soil-erosion"]}
        r = client.post(endpoint, json=dset_body, headers=headers)
        assert r.status_code == 202

        # checking that the last dataset cache file has been created
        assert os.path.isfile(rmvd_cache[1])

    def test_cache_clean(self, client: FlaskClient, faker: Faker, app: Flask) -> None:

        # reading time creation for the cache files
        creation_time = [
            os.path.getctime(x)
            for x in CACHE_DIR.iterdir()
            if "cache_conf" not in x.name
        ]

        # check clean with cache full
        invalidate_dataset_cache()
        headers = self.get("auth_header")
        endpoint = f"{API_URI}/admin/cache"
        body = {"clean": True}
        r = client.post(endpoint, json=body, headers=headers)
        assert r.status_code == 202
        time.sleep(8)
        # check that all cache files have been recreated after cleaning
        cache_files = [x for x in CACHE_DIR.iterdir() if "cache_conf" not in x.name]
        re_creation_time = [
            os.path.getctime(x)
            for x in CACHE_DIR.iterdir()
            if "cache_conf" not in x.name
        ]
        assert len(cache_files) == params.CACHE_FILE_NUMBER
        assert creation_time[0] != re_creation_time[0]

        # cleaning a single dataset from cache and checking its recreation
        dset_body = {"clean": True, "datasets": ["human-wellbeing"]}
        r = client.post(endpoint, json=dset_body, headers=headers)
        assert r.status_code == 202
        created_file = os.path.join(CACHE_DIR, "human-wellbeing_daily.cache")
        time.sleep(5)
        assert os.path.getctime(created_file) > re_creation_time[-1]

        # deleting cache files
        for f in CACHE_DIR.iterdir():
            if f.is_file():
                f.unlink()
