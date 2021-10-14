from restapi.rest.definition import Response
from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Giuseppe Trotta (g.trotta@cineca.it)"
DATASET_VHR = "era5-downscaled-over-italy"
PRODUCT_VHR = "VHR-REA_IT_1989_2020_hourly"


def get_response(client: FlaskClient, endpoint) -> Response:
    return client.get(endpoint)


class TestApp(BaseTests):
    def test_get_datasets(self, client: FlaskClient) -> None:
        """Expected no empty dataset catalog"""
        r = get_response(client, f"{API_URI}/datasets")
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert isinstance(response_data, list)
        assert len(response_data) > 0

    def test_get_applications(self, client: FlaskClient) -> None:
        r = get_response(client, f"{API_URI}/datasets?application=true")
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert isinstance(response_data, list)
        # check application flag
        for ds in response_data:
            assert ds.get("application", False)

    def test_get_dataset(self, client: FlaskClient) -> None:
        # expected era5-downscaled-over-italy dataset in test data
        r = get_response(client, f"{API_URI}/datasets/{DATASET_VHR}")
        assert r.status_code == 200

    def test_get_dataset_product(self, client: FlaskClient) -> None:
        # expected VHR-REA_IT_1989_2020_hourly product in test data
        r = get_response(
            client, f"{API_URI}/datasets/{DATASET_VHR}/products/{PRODUCT_VHR}"
        )
        assert r.status_code == 200

    def test_get_dataset_image(self, client: FlaskClient) -> None:
        r = get_response(client, f"{API_URI}/datasets")
        datasets = self.get_content(r)
        # iterates over each dataset
        for ds in datasets:
            get_response(client, f"{API_URI}/datasets/{ds['id']}/image")
            assert r.status_code in [200, 404]
