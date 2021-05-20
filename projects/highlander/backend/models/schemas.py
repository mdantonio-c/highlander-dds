from collections.abc import Iterable

from restapi.models import ISO8601UTC, Schema, fields


class ContactInfo(Schema):
    name = fields.Str()
    email = fields.Str()
    webpage = fields.Str()


class License(Schema):
    name = fields.Str()
    url = fields.Str()


class DatasetInfo(Schema):
    description = fields.Str()
    attribution = fields.Str()
    contact = fields.Nested(ContactInfo)
    label = fields.Str()
    image = fields.Str()
    doi = fields.Str()
    # update_frequency = fields.Str()
    license = fields.Nested(License)
    publication_date = fields.DateTime(allow_none=True, format=ISO8601UTC)
    # related_data = fields.List()


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
    variables = fields.List(fields.Str())
