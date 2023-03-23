import shutil
from pathlib import Path

from faker import Faker
from highlander.endpoints.utils import MapCropConfig
from highlander.endpoints.utils import MapCropConfig as config
from highlander.tests import TestParams as params
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log

__author__ = "Beatrice Chiavarini (b.chiavarini@cineca.it)"


class TestApp(BaseTests):
    def test_api_access(self, client: FlaskClient, faker: Faker) -> None:
        query_params = f"area_type=regions&area_id={faker.pystr()}"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/report?{query_params}"
        r = client.get(endpoint)
        assert r.status_code == 401

    def test_not_found_cases(self, client: FlaskClient, faker: Faker) -> None:
        headers, _ = BaseTests.do_login(client, None, None)
        self.save("auth_header", headers)

        # check not existing dataset
        query_params = (
            f"model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}"
        )
        fake_dataset = faker.pystr()
        endpoint = f"{API_URI}/datasets/{fake_dataset}/products/{params.PRODUCT_ID}/report?{query_params}"
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 404
        response_msg = self.get_content(r)
        assert response_msg == f"dataset {fake_dataset} not found"

        # check if dataset not present in output structure map
        original_map = config.OUTPUT_STRUCTURE_MAP
        # create a fake map without the desired dataset
        fake_map = {**original_map}
        fake_map.pop(params.DATASET_ID)
        # replace the map
        config.OUTPUT_STRUCTURE_MAP = fake_map
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/report?{query_params}"
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 500
        # restore the original map
        config.OUTPUT_STRUCTURE_MAP = original_map

        # check if there are missing parameters
        incomplete_query_params = f"area_type=regions&area_id={params.REGION_ID}"
        incomplete_endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/report?{incomplete_query_params}"
        r = client.get(incomplete_endpoint, headers=headers)
        assert r.status_code == 400
        response_msg = self.get_content(r)
        assert "parameter is needed" in response_msg

        # check not existing map
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 404
        response_msg = self.get_content(r)
        assert (
            response_msg
            == "Map file for requested report not found: Please use /crop api to create it"
        )

        # create the map
        mapcrop_query_params = f"indicator={params.INDICATOR}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=map"
        mapcrop_endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{mapcrop_query_params}"
        r = client.get(mapcrop_endpoint, headers=headers)
        assert r.status_code == 200
        map_filename = f"{params.REGION_ID.lower().replace(' ', '_').lower()}_map.png"
        map_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID,
            params.MODEL_ID,
            "regions",
            map_filename,
        )
        assert map_output_file.is_file()

        self.save("map_filepath", map_output_file)

        # check not existing plot
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 404
        response_msg = self.get_content(r)
        assert (
            response_msg
            == "Plot file for requested report not found: Please use /crop api to create it"
        )

        # check not existing plot for stripes

    def test_get_report(self, client: FlaskClient, faker: Faker) -> None:

        headers = self.get("auth_header")
        map_output_file = self.get("map_filepath")
        # create the plot
        plotcrop_query_params = f"indicator={params.INDICATOR}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=plot&plot_type=distribution"
        plotcrop_endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{plotcrop_query_params}"
        r = client.get(plotcrop_endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200

        plot_filename = (
            f"{params.REGION_ID.lower().replace(' ', '_').lower()}_distribution.png"
        )
        plot_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID,
            params.MODEL_ID,
            "regions",
            plot_filename,
        )
        assert plot_output_file.is_file()

        # get the report
        query_params = (
            f"model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}"
        )
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/report?{query_params}"
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 200
        # check the response encoding
        response_body = r.get_data().decode("latin-1")
        assert type(response_body) == str
        # I don't know how to test that the response is a correct pdf without installing some specific library..

        # get the report for stripes
        # create a fake stripes map (to create a real map there's a file missing in test suite dataset)
        mapstripes_filename = (
            f"{params.REGION_ID.lower().replace(' ', '_').lower()}_map.png"
        )
        mapstripes_output_dir = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_VHR,
            params.PRODUCT_MAPCROP_VHR,
            params.STRIPES_INDICATOR,
            params.STRIPES_REF_PERIOD,
            params.STRIPES_TIME_PERIOD,
            "regions",
        )
        mapstripes_output_dir.mkdir(parents=True, exist_ok=True)
        assert mapstripes_output_dir.is_dir()
        # copy the other map file
        mapstripes_output_file = Path(mapstripes_output_dir, mapstripes_filename)
        shutil.copy(map_output_file, mapstripes_output_file)
        assert mapstripes_output_file.is_file()

        # create the stripes plot
        stripes_query_params = f"?administrative=regions&time_period={params.STRIPES_TIME_PERIOD}&area_id={params.REGION_ID}&indicator={params.STRIPES_INDICATOR}&reference_period={params.STRIPES_REF_PERIOD}"
        stripes_endpoint = (
            f"{API_URI}/datasets/{params.DATASET_VHR}/stripes{stripes_query_params}"
        )
        r = client.get(stripes_endpoint, headers=headers)
        assert r.status_code == 200

        stripes_filename = (
            f"{params.REGION_ID.lower().replace(' ', '_').lower()}_stripes.png"
        )
        stripes_output_file = Path(
            MapCropConfig.STRIPES_OUTPUT_ROOT,
            params.STRIPES_INDICATOR,
            params.STRIPES_REF_PERIOD,
            params.STRIPES_TIME_PERIOD,
            "regions",
            stripes_filename,
        )
        # check the file has been created
        assert stripes_output_file.is_file()

        # get the report
        query_params = f"time_period={params.STRIPES_TIME_PERIOD}&area_type=regions&area_id={params.REGION_ID}&indicator={params.STRIPES_INDICATOR}&reference_period={params.STRIPES_REF_PERIOD}"
        endpoint = f"{API_URI}/datasets/{params.DATASET_VHR}/products/{params.PRODUCT_MAPCROP_VHR}/report?{query_params}"
        r = client.get(endpoint, headers=headers)
        assert r.status_code == 200
        # check the response encoding
        response_body = r.get_data().decode("latin-1")
        assert type(response_body) == str

        # remove the created elements
        map_output_file.unlink()
        plot_output_file.unlink()
        mapstripes_output_file.unlink()
        stripes_output_file.unlink()
