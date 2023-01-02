from typing import Any, Dict, List

from highlander.models.schemas import Schedule, ScheduleInput
from highlander.models.sqlalchemy import SystemSchedule
from restapi import decorators
from restapi.connectors import Connector, sqlalchemy
from restapi.exceptions import NotFound, ServerError, Unauthorized
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import Role, User
from restapi.utilities.logs import log


class AdminSchedules(EndpointResource):
    @decorators.auth.require_any(Role.ADMIN, Role.STAFF)
    @decorators.marshal_with(Schedule(many=True), code=200)
    @decorators.endpoint(
        path="/admin/schedules",
        summary="List of schedules",
        responses={
            200: "List of schedules successfully retrieved",
            409: "Request is invalid due to conflicts",
        },
    )
    def get(self, user: User) -> Response:
        # is_admin = self.auth.is_admin(user)
        # log.debug(f"User {user} - Is admin? {is_admin}")
        schedules = []

        db = sqlalchemy.get_instance()
        for s in db.SystemSchedule.query.all():
            item = {
                "id": s.id,
                "name": s.name,
                "created_at": s.created_at,
                "is_enabled": s.is_enabled,
                "crontab": s.crontab,
                "task_name": s.task_name,
                "task_args": s.task_args,
            }
            schedules.append(item)
        log.debug(schedules)

        return self.response(schedules)

    @decorators.auth.require_any(Role.ADMIN, Role.STAFF)
    @decorators.database_transaction
    @decorators.use_kwargs(ScheduleInput)
    @decorators.endpoint(
        path="/admin/schedules",
        summary="Create a new system schedule",
        responses={
            201: "The id of the new system schedule is returned",
            409: "This schedule already exists",
        },
    )
    def post(self, user: User, **kwargs: Any) -> Response:
        log.debug("Create a new schedule")
        db = sqlalchemy.get_instance()

        # check if the schedule already exists
        # res = db.SystemSchedule.query.get(int(request_id))
        # if res:
        #     raise Conflict(f"This schedule already exists: {email}")
        try:
            # save a schedule record in db
            schedule = db.SystemSchedule(
                name=kwargs["name"],
                crontab=kwargs["crontab"],
                task_name=kwargs["task_name"],
            )
            db.session.add(schedule)
            db.session.commit()
            log.info("Schedule <ID:{}> successfully saved", schedule.id)
        except Exception as exc:
            log.exception(exc)
            db.session.rollback()
            raise ServerError("Unable to create the schedule")

        self.log_event(self.events.create, schedule, kwargs)
        return self.response(schedule.id, code=201)

    @decorators.auth.require_any(Role.ADMIN, Role.STAFF)
    @decorators.endpoint(
        path="/admin/schedules/<schedule_id>",
        summary="Delete a schedule",
        responses={
            204: "Schedule successfully deleted",
            404: "Schedule not found",
            403: "You are not authorized to perform actions on this schedule",
        },
    )
    @decorators.database_transaction
    def delete(self, schedule_id: str, user: User) -> Response:
        log.debug("delete schedule {}", schedule_id)

        db = sqlalchemy.get_instance()
        # check if the request exists
        schedule = db.SystemSchedule.query.get(int(schedule_id))
        if not schedule:
            raise NotFound(f"The schedule <{schedule_id}> does NOT exist")

        # delete db entry
        db.session.delete(schedule)
        db.session.commit()

        self.log_event(self.events.delete, schedule)
        return self.empty_response()
