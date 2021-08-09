from typing import Tuple

from restapi.connectors import Connector
from restapi.customizer import BaseCustomizer, FlaskRequest, Props, User
from restapi.models import fields, validate
from restapi.rest.definition import EndpointResource

# from restapi.utilities.logs import log


class Customizer(BaseCustomizer):
    @staticmethod
    def custom_user_properties_pre(
        properties: Props,
    ) -> Tuple[Props, Props]:
        """
        executed just before user creation
        use this method to removed or manipulate input properties
        before sending to the database
        """
        extra_properties: Props = {}
        # 1 GB, as defined in sqlalchemy model
        properties.setdefault("disk_quota", 1073741824)
        return properties, extra_properties

    @staticmethod
    def custom_user_properties_post(
        user: User, properties: Props, extra_properties: Props, db: Connector
    ) -> None:
        """
        executed just after user creation
        use this method to implement extra operation needed to create a user
        e.g. store additional relationships
        """
        pass

    @staticmethod
    def manipulate_profile(ref: EndpointResource, user: User, data: Props) -> Props:
        """
        execute before sending data from the profile endpoint
        use this method to add additional information to the user profile
        """
        data["disk_quota"] = user.disk_quota

        return data

    @staticmethod
    def get_custom_input_fields(request: FlaskRequest, scope: int) -> Props:

        required = request and request.method == "POST"

        if scope == BaseCustomizer.ADMIN:
            return {
                "disk_quota": fields.Int(
                    required=required,
                    # validate=validate.Range(min=0, max=???),
                    validate=validate.Range(min=0),
                    label="Disk quota",
                    description="Disk quota in bytes",
                ),
            }

        # these are editable fields in profile
        if scope == BaseCustomizer.PROFILE:
            return {}

        # these are additional fields in registration form
        if scope == BaseCustomizer.REGISTRATION:
            return {}

        return {}

    @staticmethod
    def get_custom_output_fields(request: FlaskRequest) -> Props:
        """
        this method is used to extend the output model of profile and admin users
        """
        return {
            "disk_quota": fields.Int(),
        }
