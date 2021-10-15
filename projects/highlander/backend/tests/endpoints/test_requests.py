from restapi.rest.definition import Response
from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Giuseppe Trotta (g.trotta@cineca.it)"


class TestApp(BaseTests):
    def test_get_user_requests(self, client: FlaskClient) -> None:
        # test without login
        r = client.get(f"{API_URI}/requests")
        assert r.status_code == 401

        # TODO

    def test_get_a_request(self, client: FlaskClient) -> None:
        # TODO
        pass

    def test_download_extracted_data(self, client: FlaskClient) -> None:
        # TODO
        pass

    def test_estimate_size(self, client: FlaskClient) -> None:
        # TODO
        pass

    def test_submit_data_extraction(self, client: FlaskClient) -> None:
        # TODO
        pass
