import time
from pathlib import Path

import pytest
from celery.result import AsyncResult
from faker import Faker
from flask import Flask
from highlander.constants import CACHE_DIR
from restapi.connectors.celery import Ignore
from restapi.server import create_app
from restapi.services.cache import Cache
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log
from restapi.utilities.meta import Meta


class TestApp(BaseTests):
    CACHE_FILE_NUMBER = 6
    DATASETS_NUMBER = 4

    def invalidate_dataset_cache(self):
        # invalidate the endpoint cache
        create_app(name="Cache clearing")
        Datasets = Meta.get_class("endpoints.datasets", "Datasets")
        Cache.invalidate(Datasets.get)
        log.info("CACHE INVALIDATED")

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
        self.invalidate_dataset_cache()
        # check that cache files aren't created by get dataset endpoint
        r = client.get(get_dataset_endpoint)
        assert r.status_code == 200
        response_body = self.get_content(r)
        assert len(response_body) == 0
        r = client.post(endpoint, headers=headers)
        assert r.status_code == 202
        response_body = self.get_content(r)
        # wait the task to be fulfilled
        time.sleep(5)
        # check that the cache files has been created
        cache_files = [x for x in CACHE_DIR.iterdir()]
        assert len(cache_files) == self.CACHE_FILE_NUMBER

        # # check that the datasets are seen by get dataset endpoint
        # # invalidate the cache
        self.invalidate_dataset_cache()
        # # wait the task to be fulfilled
        time.sleep(2)
        r = client.get(get_dataset_endpoint)
        assert r.status_code == 200
        response_body = self.get_content(r)
        assert len(response_body) == self.DATASETS_NUMBER
        # # check task is not relaunched if all datasets has a cache
        log.info(
            f"not api point of view -  Cache already present: {[[x for x in CACHE_DIR.iterdir()]]}"
        )
        r = client.post(endpoint, headers=headers)
        assert r.status_code == 200
        response_body = self.get_content(r)
        assert "Nothing to be done" in response_body
