import json

from faker import Faker
from restapi.tests import API_URI, BaseTests, FlaskClient

__author__ = "Beatrice Chiavarini (b.chiavarini@cineca.it)"


GEOJSON_FILENAME = "italy-regions"


class TestApp(BaseTests):
    def test_geojson(self, client: FlaskClient, faker: Faker) -> None:

        # get a file that does not exists
        endpoint = f"{API_URI}/geojson/{faker.pystr()}"
        r = client.get(endpoint)
        assert r.status_code == 404

        # retrieve a file
        endpoint = f"{API_URI}/geojson/{GEOJSON_FILENAME}"
        r = client.get(endpoint)
        assert r.status_code == 200
        # check the file is a correct json
        retrieved_file = self.get_content(r)
        assert type(retrieved_file) == dict
