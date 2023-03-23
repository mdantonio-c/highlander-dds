from pathlib import Path

from faker import Faker
from highlander.connectors import broker
from highlander.endpoints.utils import MapCropConfig
from highlander.tests import TestParams as params
from highlander.tests import invalidate_dataset_cache
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log

__author__ = "Lucia Rodriguez Munoz (l.rodriguezmunoz@cineca.it)"


class TestApp(BaseTests):
    def test_stripes_validation_on_query_params(
        self, client: FlaskClient, faker: Faker
    ) -> None:
        # do login
        headers, _ = self.do_login(client, None, None)
        self.save("auth_header", headers)

        # check if the dataset have a cache
        dds = broker.get_instance()
        not_cached_datasets = dds.get_uncached_datasets()
        if params.DATASET_VHR in not_cached_datasets:
            dds.broker.get_details(params.DATASET_VHR)
            # invalidate the endpoint cache
            invalidate_dataset_cache()

        # request without mandatory variable "time_period".
        query_params = "?administrative=Italy"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request without mandatory variable "administrative".
        query_params = "?time_period=ANN"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request without mandatory variable "area_id" when administrative is "region" or "province".
        query_params = "?time_period=ANN&administrative=regions"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing "time_period".
        query_params = "?time_period=DoesNotExist&administrative=Italy"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing "administrative".
        query_params = "?time_period=ANN&administrative=DoesNotExist"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing region.
        query_params = "?time_period=ANN&administrative=regions&sDoesNotExist"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request with non-existing province.
        query_params = "?time_period=ANN&administrative=provinces$area_id=DoesNotExist"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

    def test_stripes_new_plot_for_different_administratives(
        self, client: FlaskClient, faker: Faker
    ) -> None:
        # do login
        headers, _ = self.do_login(client, None, None)
        self.save("auth_header", headers)

        time_periods = [
            params.STRIPES_TIME_PERIOD,
            params.STRIPES_TIME_PERIOD,
            params.STRIPES_TIME_PERIOD,
        ]
        administratives = ["Italy", "regions", "provinces"]
        area_ids = ["", "Lombardia", "Bergamo"]
        area_names = ["Italy", "lombardia", "bergamo"]

        for time_period, administrative, area_id, area_name in zip(
            time_periods, administratives, area_ids, area_names
        ):
            # request without mandatory variable "time_period".
            query_params = f"?administrative={administrative}&time_period={time_period}&area_id={area_id}&indicator={params.STRIPES_INDICATOR}&reference_period={params.STRIPES_REF_PERIOD}"
            endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
            r = client.get(endpoint, headers=self.get("auth_header"))
            assert r.status_code == 200

            output_filename = f"{area_name.replace(' ', '_').lower()}_stripes.png"
            output_path = Path(
                params.STRIPES_INDICATOR,
                params.STRIPES_REF_PERIOD,
                time_period,
                administrative,
            )
            output_dir = Path(MapCropConfig.STRIPES_OUTPUT_ROOT, output_path)
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

        time_periods = ["DJF", "DJF", "DJF"]
        administratives = ["Italy", "regions", "provinces"]
        area_ids = ["", "Lombardia", "Bergamo"]
        area_names = ["Italy", "lombardia", "bergamo"]

        for time_period, administrative, area_id, area_name in zip(
            time_periods, administratives, area_ids, area_names
        ):
            # request without mandatory variable "time_period".
            query_params = f"?administrative={administrative}&time_period={time_period}&area_id={area_id}&indicator={params.STRIPES_INDICATOR}&reference_period={params.STRIPES_REF_PERIOD}"
            endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{query_params}"
            r = client.get(endpoint, headers=self.get("auth_header"))
            assert r.status_code == 200

            output_filename = f"{area_name.replace(' ', '_').lower()}_stripes.png"
            output_path = Path(
                params.STRIPES_INDICATOR,
                params.STRIPES_REF_PERIOD,
                time_period,
                administrative,
            )
            output_dir = Path(MapCropConfig.STRIPES_OUTPUT_ROOT, output_path)
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
