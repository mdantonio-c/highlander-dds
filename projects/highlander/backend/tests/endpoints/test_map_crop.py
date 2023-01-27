from pathlib import Path
from typing import Optional

from faker import Faker
from highlander.connectors import broker
from highlander.endpoints.utils import MapCropConfig
from highlander.tests import TestParams as params
from highlander.tests import invalidate_dataset_cache
from restapi.tests import API_URI, BaseTests, FlaskClient
from restapi.utilities.logs import log

__author__ = "Beatrice Chiavarini (b.chiavarini@cineca.it)"


class TestApp(BaseTests):
    def test_map_crop_validation_on_query_params(
        self, client: FlaskClient, faker: Faker
    ) -> None:
        # do login
        headers, _ = self.do_login(client, None, None)
        self.save("auth_header", headers)

        # check if the datasets have a cache
        datasets_for_tests = [params.DATASET_ID, params.DATASET_ID2]
        dds = broker.get_instance()
        not_cached_datasets = dds.get_uncached_datasets()
        if (
            params.DATASET_ID in not_cached_datasets
            or params.DATASET_ID2 in not_cached_datasets
        ):
            for d in datasets_for_tests:
                dds.broker.get_details(d)
            # invalidate the endpoint cache
            invalidate_dataset_cache()

        # request a bounding box without the coordinates
        query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=bbox&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request an administrative without the id
        query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=regions&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # request a plot without specifying the plot type
        query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=regions&area_id={faker.pystr()}&type=plot"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400

        # test parameter needed by the single datasets
        soil_erosion_query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=regions&area_id={faker.pystr()}&type=map"
        human_wellbeing_daily_params = f"indicator={faker.pystr()}&daily_metric={params.DAILY_METRIC}&year={faker.pystr()}&date=2020-01-01&area_type=regions&area_id={faker.pystr()}&type=map"
        human_wellbeing_multiyear_params = f"indicator={faker.pystr()}&daily_metric={params.DAILY_METRIC}&area_type=regions&area_id={faker.pystr()}&type=map"

        # check soil erosion without mandatory params for all products
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{human_wellbeing_daily_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400
        # check soil erosion with its parameters and a region that does not exists
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{soil_erosion_query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404

        # check human wellbeing without mandatory params for single product
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID2}/products/daily/crop?{human_wellbeing_multiyear_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 400
        # check human wellbeing with all its parameters and a region that does not exists
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID2}/products/daily/crop?{human_wellbeing_daily_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404
        # check human wellbeing with all parameters common between the different products and a region that does not exists
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID2}/products/{params.PRODUCT_ID_HW}/crop?{human_wellbeing_multiyear_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404

    def test_map_crop_not_found_response(
        self, client: FlaskClient, faker: Faker
    ) -> None:

        # get a dataset that does not exists
        query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=map"
        endpoint = f"{API_URI}/datasets/{faker.pystr()}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404

        # get a product that does not exists
        query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{faker.pystr()}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404

        # get a model that does not exists
        query_params = f"indicator={faker.pystr()}&model_id={faker.pystr()}&area_type=regions&area_id={params.REGION_ID}&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404

        # get an indicator that does not exists
        query_params = f"indicator={faker.pystr()}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 404

    def test_map_crop_get_a_map(self, client: FlaskClient, faker: Faker) -> None:
        # crop a region
        query_params = f"indicator={params.INDICATOR}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        region_filename = (
            f"{params.REGION_ID.lower().replace(' ', '_').lower()}_map.png"
        )
        region_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID,
            params.MODEL_ID,
            "regions",
            region_filename,
        )
        # check the naming convention has been respected
        assert region_output_file.is_file()

        file_creation_time = region_output_file.stat().st_mtime
        # check the file is not recreated again the second time
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        assert region_output_file.stat().st_mtime == file_creation_time

        # crop a province on human wellbeing dataset
        query_params = f"indicator={params.INDICATOR_HW}&daily_metric={params.DAILY_METRIC}&area_type=provinces&area_id={params.PROVINCE_ID}&type=map"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID2}/products/{params.PRODUCT_ID_HW}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        province_filename = (
            f"{params.PROVINCE_ID.title().replace(' ', '_').lower()}_map.png"
        )
        province_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID2,
            params.PRODUCT_ID_HW,
            params.INDICATOR_HW,
            "provinces",
            province_filename,
        )
        # check the naming convention has been respected
        assert province_output_file.is_file()

        file_creation_time = province_output_file.stat().st_mtime
        # check the file is not recreated again the second time
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        assert province_output_file.stat().st_mtime == file_creation_time

        # delete all
        region_output_file.unlink()
        province_output_file.unlink()

    def test_map_crop_get_a_plot(self, client: FlaskClient, faker: Faker) -> None:
        # get a json plot
        query_params = f"indicator={params.INDICATOR}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=plot&plot_format=json"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        # check type of the content of the response
        response_body = self.get_content(r)
        assert isinstance(response_body, dict)

        region_json_filename = (
            f"{params.REGION_ID.lower().replace(' ', '_').lower()}.json"
        )
        region_json_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID,
            params.MODEL_ID,
            "regions",
            region_json_filename,
        )
        # check the naming convention has been respected
        assert region_json_output_file.is_file()

        file_creation_time = region_json_output_file.stat().st_mtime
        # check naming is independent of plot type
        query_params = f"indicator={params.INDICATOR}&model_id={params.MODEL_ID}&area_type=regions&area_id={params.REGION_ID}&type=plot&plot_format=json&plot_type=boxplot"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        output_dir = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID,
            params.MODEL_ID,
            "regions",
        )
        assert len([f for f in output_dir.iterdir()]) == 1

        # check the file is not recreated again the second time
        assert region_json_output_file.stat().st_mtime == file_creation_time

        # test boxplot
        query_params = f"indicator={params.INDICATOR2}&model_id={params.MODEL_ID2}&area_type=regions&area_id={params.REGION_ID}&type=plot&plot_type=boxplot"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID2}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200

        region_filename = (
            f"{params.REGION_ID.lower().replace(' ', '_').lower()}_boxplot.png"
        )
        region_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID2,
            params.MODEL_ID2,
            "regions",
            region_filename,
        )
        # check the naming convention has been respected
        assert region_output_file.is_file()

        file_creation_time = region_output_file.stat().st_mtime
        # check the file is not recreated again the second time
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        assert region_output_file.stat().st_mtime == file_creation_time

        # test distribution
        query_params = f"indicator={params.INDICATOR}&model_id={params.MODEL_ID}&area_type=provinces&area_id={params.PROVINCE_ID}&type=plot&plot_type=distribution"
        endpoint = f"{API_URI}/datasets/{params.DATASET_ID}/products/{params.PRODUCT_ID}/crop?{query_params}"
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200

        province_filename = (
            f"{params.PROVINCE_ID.title().replace(' ', '_').lower()}_distribution.png"
        )
        province_output_file = Path(
            MapCropConfig.CROPS_OUTPUT_ROOT,
            params.DATASET_ID,
            params.PRODUCT_ID,
            params.MODEL_ID,
            "provinces",
            province_filename,
        )
        # check the naming convention has been respected
        assert province_output_file.is_file()

        file_creation_time = province_output_file.stat().st_mtime
        # check the file is not recreated again the second time
        r = client.get(endpoint, headers=self.get("auth_header"))
        assert r.status_code == 200
        assert province_output_file.stat().st_mtime == file_creation_time

        # delete all
        region_json_output_file.unlink()
        region_output_file.unlink()
        province_output_file.unlink()
