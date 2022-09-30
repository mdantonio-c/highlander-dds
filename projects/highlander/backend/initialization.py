from restapi.connectors import celery
from restapi.utilities.logs import log


class Initializer:
    """
    This class is instantiated just after restapi init
    Implement the constructor to add operations performed one-time at initialization
    """

    def __init__(self) -> None:
        celery_app = celery.get_instance()
        crop_water_crontab_task_name = "crop-water-data-sync"
        task = celery_app.get_periodic_task(name=crop_water_crontab_task_name)
        if task:
            log.info(f"Delete existing task <{crop_water_crontab_task_name}>")
            celery_app.delete_periodic_task(name=crop_water_crontab_task_name)
        # Executes every Wednesday morning at 6:00 a.m.
        celery_app.create_crontab_task(
            name=crop_water_crontab_task_name,
            task="retrieve_crop_water",
            day_of_week="3",
            hour="6",
            minute="0",
        )

        sub_seasonal_crontab_task_name = "sub-seasonal-data-sync"
        task = celery_app.get_periodic_task(name=sub_seasonal_crontab_task_name)
        if task:
            log.info(f"Delete existing task <{sub_seasonal_crontab_task_name}>")
            celery_app.delete_periodic_task(name=sub_seasonal_crontab_task_name)
        # Executes every Tuesday and Friday morning at 5:00 a.m.
        celery_app.create_crontab_task(
            name=sub_seasonal_crontab_task_name,
            task="clean_cache",
            args=[
                [
                    "sub-seasonal_sub-seasonal_BiasCorr",
                    "sub-seasonal_sub-seasonal_ecPoint_perc",
                ]
            ],
            day_of_week="2,5",
            hour="5",
            minute="0",
        )

    # This method is called after normal initialization if TESTING mode is enabled
    def initialize_testing_environment(self) -> None:
        pass
