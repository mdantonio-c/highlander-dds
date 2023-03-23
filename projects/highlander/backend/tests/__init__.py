from restapi.server import create_app
from restapi.services.cache import Cache
from restapi.utilities.logs import log
from restapi.utilities.meta import Meta


class TestParams:
    DATASET_ID = "soil-erosion"
    DATASET_ID2 = "human-wellbeing"
    PRODUCT_ID = "rainfall-erosivity"
    PRODUCT_ID_HW = "multi-year"
    INDICATOR_HW = "WC"
    DAILY_METRIC = "daymax"
    INDICATOR = "RF"
    PRODUCT_ID2 = "soil-loss"
    INDICATOR2 = "SL"
    MODEL_ID = "R1"
    MODEL_ID2 = "SL1"
    REGION_ID = "Friuli Venezia Giulia"
    PROVINCE_ID = "l'aquila"
    STRIPES_TIME_PERIOD = "DJF"
    STRIPES_INDICATOR = "T_2M"
    STRIPES_REF_PERIOD = "1981-2010"

    # for dataset cache
    CACHE_FILE_NUMBER = 5
    DATASETS_NUMBER = 4

    DATASET_VHR = "era5-downscaled-over-italy"
    PRODUCT_MAPCROP_VHR = "VHR-REA_IT_1981_2020"
    PRODUCT_VHR = "VHR-REA_IT_1981_2020_hourly"


def invalidate_dataset_cache():
    # invalidate the endpoint cache
    create_app(name="Cache clearing")
    Datasets = Meta.get_class("endpoints.datasets", "Datasets")
    Cache.invalidate(Datasets.get)
    log.info("CACHE INVALIDATED")
