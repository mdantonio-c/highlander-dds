from restapi import decorators
from restapi.connectors import sqlalchemy
from restapi.exceptions import ServerError
from restapi.rest.definition import EndpointResource, Response
from sqlalchemy.sql import func


class Usage(EndpointResource):

    labels = ["usage"]

    @decorators.auth.require()
    @decorators.endpoint(
        path="/usage",
        summary="Get user disk usage.",
        responses={200: "Disk usage information"},
    )
    def get(self) -> Response:
        """
        Get actual user disk quota and current usage
        """
        user = self.get_user()
        if not user:
            raise ServerError("User misconfiguration")

        # get current usage
        db = sqlalchemy.get_instance()
        total_used = (
            db.session.query(func.sum(db.OutputFile.size).label("total_used"))
            .join(db.Request)
            .filter(db.Request.user_id == user.id, db.OutputFile.size is not None)
            .all()[0][0]
        )
        if total_used is None:
            total_used = 0

        data = {"quota": user.disk_quota, "used": total_used}
        return self.response(data)
