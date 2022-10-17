from pathlib import Path
from typing import List, Optional

from flask import send_from_directory

from restapi import decorators
from restapi.exceptions import NotFound
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log
from restapi.models import Schema, fields, validate
from marshmallow import ValidationError, pre_load

ADMINISTRATIVES = ["Italy", "regions", "provinces"]


class StripesDetails(Schema):
    time_period = fields.Str(required=True)   # TODO validate
    area_id = fields.Str(required=False)
    administrative = fields.Str(required=True, validate=validate.OneOf(ADMINISTRATIVES))

    # @pre_load  # TODO if admininstrative different from Italy, then we need a area_id.
    # def params_validation(
    #     self, data: Dict[str, Union[str, list[float]]], **kwargs: Any
    # ) -> Dict[str, Union[str, list[float]]]:
    #     area_type = data.get("area_type")
    #     area_coords = data.get("area_coords", None)
    #     area_id = data.get("area_id", None)
    #     # check if area coords are needed
    #     if area_type == "bbox" or area_type == "polygon":
    #         if not area_coords:
    #             raise ValidationError(
    #                 f"coordinates have to be specified for {area_type} area type"
    #             )
    #     # check if area_id is needed
    #     elif area_type == "regions" or area_type == "provinces":
    #         if not area_id:
    #             raise ValidationError(
    #                 f"an area id has to be specified for {area_type} area type"
    #             )
    #
    #     # check if plot type is needed. A plot type has to be specified only if the requested output is a png
    #     type = data.get("type")
    #     plot_type = data.get("plot_type", None)
    #     plot_format = data.get("plot_format", None)
    #     if not plot_format or plot_format == "png":
    #         if type == "plot" and not plot_type:
    #             raise ValidationError("a plot type have to be specified")
    #
    #     return data

class Stripes(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/stripes",  # TODO 
        summary="Get climate stripes",
        responses={
            200: "Climate stripes successfully retrieved",
            400: "missing parameters",
            404: "Area not found",
            500: "Errors in cropping or plotting the data",
        },
    )
    @decorators.use_kwargs(
        StripesDetails,
        location="query"
    )
    @decorators.auth.require()
    def get(self, user, dataset_id: str, time_period:str, administrative: str, area_id: Optional[str] = None) -> Response:
        #log.debug("Filter for application dataset? {}", application)
        res = "OK"
        return self.response(res)