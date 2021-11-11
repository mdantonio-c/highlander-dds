from typing import Any, Dict

from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Giuseppe Trotta (g.trotta@cineca.it)"


class TestApp(BaseTests):
    def test_usage(self, client: FlaskClient) -> None:
        endpoint = f"{API_URI}/usage"

        # test without login
        r = client.get(endpoint)
        assert r.status_code == 401

        # test authenticated user
        headers, _ = self.do_login(client, None, None)
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 200

        # test response content
        assert r.headers["Content-Type"] == "application/json"
        response_body = self.get_content(r)
        assert isinstance(response_body, dict)
        assert isinstance(response_body["quota"], int)
        assert isinstance(response_body["used"], int)
        assert response_body["quota"] >= response_body["used"]
