import json
from typing import Any, Dict, Iterator, Optional

import pytest
from celery.result import AsyncResult
from highlander.models.sqlalchemy import Request
from restapi.connectors import sqlalchemy
from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Giuseppe Trotta (g.trotta@cineca.it)"
DATASET_NAME = "era5-downscaled-over-italy"
PRODUCT_NAME = "VHR-REA_IT_1989_2020_hourly"
PRODUCT_FORMAT = "netcdf"


class TestApp(BaseTests):
    def test_get_user_requests(self, client: FlaskClient) -> None:
        endpoint = f"{API_URI}/requests"

        # test without login
        r = client.get(endpoint)
        assert r.status_code == 401

        # test authenticated user : default
        headers, _ = self.do_login(client, None, None)
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 200

        # test response content
        assert r.headers["Content-Type"] == "application/json"
        response_body = self.get_content(r)
        assert isinstance(response_body, list)

    def test_get_a_request(self, client: FlaskClient) -> None:
        # TODO
        pass

    def test_download_extracted_data(self, client: FlaskClient) -> None:
        # TODO
        pass

    def test_estimate_size(
        self,
        client: FlaskClient,
        data_filter: Dict[str, Any],
        headers: Optional[Dict[str, str]],
    ) -> None:
        endpoint = f"{API_URI}/estimate-size"

        # submit size estimation request
        r = client.post(f"{endpoint}/{DATASET_NAME}", data=data_filter, headers=headers)
        assert r.status_code == 200

        response_body = self.get_content(r)
        assert isinstance(response_body, int)

    def test_data_extraction(
        self,
        client: FlaskClient,
        data_request: Request,
        headers: Optional[Dict[str, str]],
    ) -> None:

        # check task execution results
        task_id = data_request.task_id
        task = AsyncResult(task_id)
        assert task is not None
        result = task.get(timeout=5)
        assert result is None
        assert task.state == "SUCCESS"

    @pytest.fixture
    def headers(self, client: FlaskClient) -> Optional[Dict[str, str]]:
        """login: default user"""
        headers, _ = self.do_login(client, None, None)
        return headers

    @pytest.fixture
    def data_request(
        self,
        client: FlaskClient,
        data_filter: Dict[str, Any],
        headers: Optional[Dict[str, str]],
    ) -> Iterator[Request]:
        """submit data request"""
        endpoint = f"{API_URI}/requests"
        r = client.post(f"{endpoint}/{DATASET_NAME}", data=data_filter, headers=headers)
        assert r.status_code == 202

        task_id = self.get_content(r)
        assert isinstance(task_id, str)

        # check a task request has been created
        db = sqlalchemy.get_instance()
        db_request = db.Request.query.filter_by(task_id=task_id).first()
        assert db_request is not None
        assert db_request.status == "PENDING"
        yield db_request

        # teardown test request
        r = client.delete(f"{API_URI}/requests/{db_request.id}", headers=headers)
        assert r.status_code == 200

    @pytest.fixture
    def data_filter(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "product": PRODUCT_NAME,
            "format": PRODUCT_FORMAT,
            "variable": json.dumps(["air_temperature"]),
        }
        # add any other filters
        return data
