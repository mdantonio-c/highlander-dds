from typing import Iterable, Mapping

import numpy as np
from restapi.models import ISO8601UTC, Schema, fields
from restapi.utilities.logs import log


class ValueLabelPair(Schema):
    value = fields.Str()
    label = fields.Str()


class ContactInfo(Schema):
    name = fields.Str()
    email = fields.Str()
    webpage = fields.Str()


class License(Schema):
    name = fields.Str()
    url = fields.Str()


class RelatedData(Schema):
    name = fields.Str()
    url = fields.Str()


class ValueLabelUnit(ValueLabelPair):
    units = fields.Str()


class ProductReference(Schema):
    id = fields.Str()
    description = fields.Str()
    variables = fields.List(fields.Nested(ValueLabelUnit))


class DatasetInfo(Schema):
    id = fields.Str(required=True)
    label = fields.Str(required=True)
    default = fields.Str(required=True)
    description = fields.Str()
    attribution = fields.Str()
    contact = fields.Nested(ContactInfo)
    image = fields.Str()
    doi = fields.Str()
    update_frequency = fields.Str()
    license = fields.Nested(License)
    publication_date = fields.DateTime(allow_none=True, format=ISO8601UTC)
    application = fields.Boolean(default=False)
    related_data = fields.List(fields.Nested(RelatedData))
    products = fields.List(
        fields.Nested(ProductReference),
        min_items=1,
        required=True,
    )


class NumpyDateTime(fields.Field):
    """A formatted numpy datetime64 string."""

    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return None
        return np.datetime_as_string(value, unit="s")
        # return np.datetime64(value).item().replace(tzinfo=pytz.UTC).isoformat('T')


class PolyRange(fields.Field):
    """Field that serializes multi-type app-level objects for range"""

    def __init__(self, mapping: Mapping[str, fields.Field]):
        self.mapping = mapping
        super().__init__()

    def _serialize(self, value, attr, obj, **kwargs):
        obj_cls = value.__class__.__name__
        # log.debug('-- obj cls: {},  value: {} ------------', obj_cls, value)
        try:
            field = self.mapping[obj_cls]
            return field._serialize(value, attr, obj, **kwargs)
        except KeyError:
            log.warning(f"Mapping not found for obj class <{obj_cls}>")


class FieldDetails(Schema):
    name = fields.Str()
    label = fields.Str()
    range = PolyRange(
        {
            "datetime64": NumpyDateTime(),
            "float32": fields.Float(),
            "list": fields.List(fields.Float()),
        }
    )


class WidgetDetails(Schema):
    """Expected one of the following"""

    _values = fields.List(fields.Nested(ValueLabelPair), data_key="values")
    widgets = fields.List(fields.Str())
    fields = fields.List(fields.Nested(FieldDetails))


class Widget(Schema):
    name = fields.Str()
    label = fields.Str()
    icon = fields.Str()
    required = fields.Bool()
    parameter = fields.Str()
    type = fields.Str()
    details = fields.Nested(WidgetDetails)
    help = fields.Str()
    info = fields.Str()


class ProductInfo(Schema):
    id = fields.Str(required=True)
    label = fields.Str()
    dataset = fields.Nested(DatasetInfo)
    widgets = fields.List(fields.Nested(Widget))
    widgets_order = fields.List(
        fields.Str(),
        unique=True,
        min_items=1,
        required=True,
    )
    constraints = fields.Str()


class ListOfInt(fields.List):
    def _serialize(self, value, attr, obj, **kwargs):
        if not isinstance(value, Iterable):
            value = [int(value)]
        return super()._serialize(value, attr, obj, **kwargs)


class VariableSchema(Schema):
    name = fields.Str()
    standard_name = fields.Str()
    long_name = fields.Str()
    units = fields.Str()
    grid_mapping = fields.Str()
    cell_methods = fields.Str()
    dds_description = fields.Str()
    dds_dtype = fields.Str()
    dds_nb_elements = ListOfInt(fields.Int())
    label = fields.Str()
    depending_coords = fields.List(fields.Str())


class CoordinateSchema(Schema):
    name = fields.Str()
    standard_name = fields.Str()
    long_name = fields.Str()
    dds_nb_elements = ListOfInt(fields.Int())


class ProductSchema(Schema):
    variables = fields.Dict(keys=fields.Str(), values=fields.Nested(VariableSchema))
    coordinates = fields.Dict(keys=fields.Str(), values=fields.Nested(CoordinateSchema))


class DatasetSchema(Schema):
    name = fields.Str()
    dataset_info = fields.Nested(DatasetInfo, data_key="info")
    products = fields.Dict(
        keys=fields.Str(), values=fields.List(fields.Nested(ProductSchema))
    )


class DataExtraction(Schema):
    product = fields.Str(required=True)
    variables = fields.List(fields.Str())
