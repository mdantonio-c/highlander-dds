from typing import Any, Dict, List

from cron_converter import Cron
from highlander.models.schemas import Schedule, ScheduleInput
from restapi import decorators
from restapi.connectors import celery, sqlalchemy
from restapi.exceptions import BadRequest, Conflict, NotFound, ServerError
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
            400: "Bad request",
            409: "This schedule already exists",
        },
    )
    def post(self, user: User, **kwargs: Any) -> Response:
        log.debug("Create a new schedule")
        db = sqlalchemy.get_instance()
        celery_app = celery.get_instance()

        try:
            # try to create a celery-beat task
            schedule_name = kwargs["name"]
            task_name = kwargs["task_name"]
            task_args = kwargs.get("task_args")
            task_crontab = kwargs["crontab"]

            # check if the schedule already exists
            task = celery_app.get_periodic_task(name=schedule_name)
            if task:
                # DO NOT register a schedule task with same name
                raise LookupError(f"This schedule already exists: {schedule_name}")

            # check for valid crontab
            cron_instance = Cron()
            # the follow will raise ValueError for improper crontab expression
            cron_instance.from_string(task_crontab)

            cron_list = cron_instance.to_list()
            cron_minute = ",".join([str(e) for e in cron_list[0]])
            cron_hour = ",".join([str(e) for e in cron_list[1]])
            cron_day_of_week = ",".join([str(e) for e in cron_list[4]])

            celery_app.create_crontab_task(
                name=schedule_name,
                task=task_name,
                args=task_args,
                day_of_week=cron_day_of_week,
                hour=cron_hour,
                minute=cron_minute,
            )

            # save a schedule record in db
            schedule = db.SystemSchedule(
                name=schedule_name,
                crontab=task_crontab,
                task_name=task_name,
            )
            if task_args := kwargs.get("task_args"):
                schedule.task_args = task_args

            db.session.add(schedule)
            db.session.commit()
            log.info("Schedule <ID:{}> successfully saved", schedule.id)

        except LookupError as exc:
            db.session.rollback()
            raise Conflict(str(exc))
        except ValueError as exc:
            db.session.rollback()
            raise BadRequest(str(exc))
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

        # check if the schedule already exists
        celery_app = celery.get_instance()
        task = celery_app.get_periodic_task(name=schedule.name)
        if task:
            celery_app.delete_periodic_task(name=schedule.name)

        # delete db entry
        db.session.delete(schedule)
        db.session.commit()

        self.log_event(self.events.delete, schedule)
        return self.empty_response()
