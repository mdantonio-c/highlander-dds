from restapi.tests import API_URI, BaseTests


class TestApp(BaseTests):
    def test_get_datasets(self, client):
        endpoint = API_URI + "/datasets"
        r = client.get(endpoint)
        assert r.status_code == 200

        # check response type
        response_data = self.get_content(r)
        assert type(response_data) == list
