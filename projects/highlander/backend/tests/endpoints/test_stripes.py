from pathlib import Path
from faker import Faker
from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Lucia Rodriguez Munoz (l.rodriguezmunoz@cineca.it)"

DATASET_ID = "era5-downscaled-over-italy"

class TestApp(BaseTests):
    def test_stripes_validation_on_query_params(
        self, client: FlaskClient, faker: Faker
    ) -> None:
        # do login
        headers, _ = self.do_login(client, None, None)
        self.save("auth_header", headers)

        # request without mandatory variable "time_period".
        query_params = (
            f"?administrative=Italy"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request without mandatory variable "administrative".
        query_params = (
            f"?time_period=ANN"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request without mandatory variable "area_id" when administrative is "region" or "province".
        query_params = (
            f"?time_period=ANN&administrative=regions"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing "time_period".
        query_params = (
            f"?time_period=DoesNotExist&administrative=Italy"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing "administrative".
        query_params = (
            f"?time_period=ANN&administrative=DoesNotExist"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing region.
        query_params = (
            f"?time_period=ANN&administrative=regions&sDoesNotExist"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing province.
        query_params = (
            f"?time_period=ANN&administrative=provinces$area_id=DoesNotExist"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes?{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

