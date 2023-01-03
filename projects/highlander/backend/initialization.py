from cron_converter import Cron
from restapi.connectors import celery, sqlalchemy
from restapi.utilities.logs import log


class Initializer:
    """
    This class is instantiated just after restapi init
    Implement the constructor to add operations performed one-time at initialization
    """

    def __init__(self) -> None:
        log.info("App initialization...")
        celery_app = celery.get_instance()

        # lookup for system schedules from the database and activate them in Celery accordingly
        db = sqlalchemy.get_instance()
        sys_schedules = db.SystemSchedule.query.all()
        log.info(f"Number of DB schedules: {len(sys_schedules)}")
        for s in sys_schedules:
            log.info(s)
            task = celery_app.get_periodic_task(name=s.name)
            if s.is_enabled and task is None:
                # CREATE a Celery scheduled task
                cron_instance = Cron()
                cron_instance.from_string(s.crontab)

                cron_list = cron_instance.to_list()
                cron_minute = ",".join([str(e) for e in cron_list[0]])
                cron_hour = ",".join([str(e) for e in cron_list[1]])
                cron_day_of_week = ",".join([str(e) for e in cron_list[4]])

                celery_app.create_crontab_task(
                    name=s.name,
                    task=s.task_name,
                    args=s.task_args,
                    day_of_week=cron_day_of_week,
                    hour=cron_hour,
                    minute=cron_minute,
                )
            if not s.is_enabled and task:
                # DELETE existing Celery scheduled task
                celery_app.delete_periodic_task(name=s.name)

    def initialize_testing_environment(self) -> None:
        """This method is called after normal initialization if TESTING mode is enabled."""
        pass
