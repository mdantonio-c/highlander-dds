from typing import List, Optional

from highlander.connectors import broker
from restapi import decorators
from restapi.connectors import celery
from restapi.exceptions import NotFound, ServiceUnavailable
from restapi.models import fields
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import Role, User
from restapi.utilities.logs import log


class CacheCreation(EndpointResource):
    @decorators.auth.require_any(Role.ADMIN)
    @decorators.use_kwargs(
        {
            "datasets": fields.List(fields.String, required=False),
            "clean": fields.Bool(required=False),
            "exclude": fields.List(fields.String, required=False),
        }
    )
    @decorators.endpoint(
        path="/admin/cache",
        summary="Create or clean the dds cache",
        responses={
            200: "nothing to be done: all the datasets has a cache",
            202: "The task of cache creation/cleaning is succesfully send",
            404: "dataset not found",
            503: "unable to submit the request",
        },
    )
    def post(
        self,
        user: User,
        datasets: Optional[List[str]] = [],
        exclude: Optional[List[str]] = [],
        clean: bool = False,
    ) -> Response:
        dds = broker.get_instance()
        # check if the datasets exists
        existing_datasets = list(dds.broker.list_datasets())
        product_keys: Optional[List[str]] = []
        if datasets:
            for d in datasets:
                if d not in existing_datasets:
                    raise NotFound(f"Dataset {d} does not exists")
                    # get all dataset cache names
                for product in dds.broker.open_catalog(dds.broker.catalog[d].path):
                    product_key = dds.broker.generate_product_key(
                        dataset_name=d, product_type=product
                    )
                    product_keys.append(product_key)

        c = celery.get_instance()
        try:
            if not clean:
                # get the datasets without a cache
                datasets_wout_cache = dds.get_uncached_datasets()
                # check if there are requested datasets
                if datasets:
                    datasets_wout_cache = [
                        x for x in datasets_wout_cache if x in datasets
                    ]
                    if not datasets_wout_cache:
                        return self.response(
                            "Nothing to be done: the requested datasets have a cache"
                        )
                # check if there are datasets to exclude
                if exclude:
                    datasets_wout_cache = [
                        x for x in datasets_wout_cache if x not in exclude
                    ]

                # if not clean option and all the dataset has a cache warn that nothing has to be done
                if not datasets_wout_cache:
                    return self.response(
                        "Nothing to be done: all the datasets have a cache"
                    )

                # create
                task = c.celery_app.send_task(
                    "create_cache",
                    args=([datasets_wout_cache]),
                    countdown=1,
                )
            else:
                # clean the cache
                task = c.celery_app.send_task(
                    "clean_cache",
                    args=([product_keys]),
                    countdown=1,
                )
        except Exception:
            raise ServiceUnavailable(
                "Unable to submit the request",
            )
        r = {"task_id": task.id}
        return self.response(r, code=202)
