from pathlib import Path
from faker import Faker
from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Lucia Rodriguez Munoz (l.rodriguezmunoz@cineca.it)"

DATASET_ID = "era5-downscaled-over-italy"
STRIPES_OUTPUT_ROOT = Path("/catalog/climate_stripes/")


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
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request without mandatory variable "administrative".
        query_params = (
            f"?time_period=ANN"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request without mandatory variable "area_id" when administrative is "region" or "province".
        query_params = (
            f"?time_period=ANN&administrative=regions"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing "time_period".
        query_params = (
            f"?time_period=DoesNotExist&administrative=Italy"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing "administrative".
        query_params = (
            f"?time_period=ANN&administrative=DoesNotExist"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing region.
        query_params = (
            f"?time_period=ANN&administrative=regions&sDoesNotExist"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing province.
        query_params = (
            f"?time_period=ANN&administrative=provinces$area_id=DoesNotExist"
        )
        endpoint = (
            f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
        )
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

    def test_stripes_new_plot_for_different_administratives(
             self, client: FlaskClient, faker: Faker
    ) -> None:
        # do login
        headers, _ = self.do_login(client, None, None)
        self.save("auth_header", headers)

        time_periods = ['DJF','DJF','DJF']
        administratives = ["Italy","regions","provinces"]
        area_ids = ["","Lombardia","Bergamo"]
        area_names = ['Italy','lombardia','bergamo']

        for time_period, administrative, area_id, area_name in zip(time_periods, administratives, area_ids, area_names):
            # request without mandatory variable "time_period".
            query_params = (
                f"?administrative={administrative}&time_period={time_period}&area_id={area_id}"
            )
            endpoint = (
                f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
            )
            r = client.get(endpoint, headers=self.get("auth_header"))
            assert r.status_code == 200

            output_filename = f"{area_name.replace(' ', '_').lower()}_stripes.png"
            output_path = f"{time_period}/{administrative}"
            output_dir = Path(STRIPES_OUTPUT_ROOT, output_path)
            output_filepath = Path(output_dir, output_filename)

            # check the naming convention has been respected
            # check the file has been created
            assert output_filepath.is_file()

            output_filepath.unlink()


    def test_stripes_when_plot_already_exists_for_different_administratives(
             self, client: FlaskClient, faker: Faker
    ) -> None:
        # do login
        headers, _ = self.do_login(client, None, None)
        self.save("auth_header", headers)

        time_periods = ['DJF','DJF','DJF']
        administratives = ["Italy","regions","provinces"]
        area_ids = ["","Lombardia","Bergamo"]
        area_names = ['Italy','lombardia','bergamo']

        for time_period, administrative, area_id, area_name in zip(time_periods, administratives, area_ids, area_names):
            # request without mandatory variable "time_period".
            query_params = (
                f"?administrative={administrative}&time_period={time_period}&area_id={area_id}"
            )
            endpoint = (
                f"{API_URI}/datasets/{DATASET_ID}/stripes{query_params}"
            )
            r = client.get(endpoint, headers=self.get("auth_header"))
            assert r.status_code == 200

            output_filename = f"{area_name.replace(' ', '_').lower()}_stripes.png"
            output_path = f"{time_period}/{administrative}"
            output_dir = Path(STRIPES_OUTPUT_ROOT, output_path)
            output_filepath = Path(output_dir, output_filename)

            # check the naming convention has been respected
            # check the file has been created
            assert output_filepath.is_file()

            file_creation_time = output_filepath.stat().st_mtime
            # check the file is not recreated again the second time
            r = client.get(endpoint, headers=self.get("auth_header"))
            assert r.status_code == 200
            assert output_filepath.stat().st_mtime == file_creation_time

            output_filepath.unlink()

    