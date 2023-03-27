import math
import os
import warnings
from pathlib import Path
from typing import Any, List, Optional

import cartopy  # type: ignore
import cartopy.crs as ccrs  # type: ignore
import geopandas as gpd  # type: ignore
import matplotlib as mpl  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import numpy as np
import pandas as pd  # type: ignore
import regionmask  # type: ignore
import requests
import seaborn as sns  # type: ignore
import xarray as xr  # type: ignore
from matplotlib import cm
from restapi.exceptions import ServerError
from restapi.utilities.logs import log

# set the cartopy data_dir
cartopy.config["data_dir"] = os.getenv(
    "CARTOPY_DATA_DIR", cartopy.config.get("data_dir")
)


class MapCropConfig:
    GEOJSON_PATH = "/catalog/assets"

    PRODUCT_EXCEPTION = {
        "human-wellbeing": {"multi-year": "daily", "anomalies": "daily"},
        "soil-erosion": {
            "rainfall-erosivity-anomalies": "rainfall-erosivity-proj",
            "soil-loss-anomalies": "soil-loss-proj",
        },
        "land-suitability-for-forests": {
            "bioclimatic-precipitations-hist": "bioclimatic-variables-hist",
            "bioclimatic-precipitations-proj": "bioclimatic-variables-proj",
            "bioclimatic-temperatures-hist": "bioclimatic-variables-hist",
            "bioclimatic-temperatures-proj": "bioclimatic-variables-proj",
        },
    }

    CROPS_OUTPUT_ROOT = Path("/catalog/crops/")
    STRIPES_OUTPUT_ROOT = Path("/catalog/climate_stripes/")

    # variable used for the cases where the model name and the file name does not match
    MODELS_MAPPING = {"RF": "R"}

    # mandatory params for the different datasets and their different products
    MANDATORY_PARAM_MAP = {
        "soil-erosion": {"all_products": ["model_id"]},
        "human-wellbeing": {
            "all_products": ["daily_metric", "indicator"],
            "daily": ["year", "date"],
            "anomalies": ["time_period"],
        },
        "era5-downscaled-over-italy": {
            "all_products": ["time_period", "indicator", "reference_period"]
        },
        "land-suitability-for-forests": {"all_products": ["indicator"]},
    }

    # output structure for the different datasets and their different products
    OUTPUT_STRUCTURE_MAP = {
        "soil-erosion": {
            "all_products": ["dataset_id", "product_id", "model_id", "area_type"]
        },
        "human-wellbeing": {
            "daily": [
                "dataset_id",
                "product_id",
                "indicator",
                "year",
                "date",
                "area_type",
            ],
            "multi-year": ["dataset_id", "product_id", "indicator", "area_type"],
            "anomalies": [
                "dataset_id",
                "product_id",
                "indicator",
                "time_period",
                "area_type",
            ],
        },
        "era5-downscaled-over-italy": {
            "all_products": [
                "dataset_id",
                "product_id",
                "indicator",
                "reference_period",
                "time_period",
                "area_type",
            ],
        },
        "land-suitability-for-forests": {
            "all_products": ["dataset_id", "product_id", "indicator", "area_type"],
        },
    }

    # url where to find source data files for the different datasets
    SOURCE_FILE_URL_MAP = {
        "soil-erosion": {
            "rainfall-erosivity": {
                "url": "soil-erosion/Rfactor/model_filename_1991_2020_VHR-REA_regular.nc",
                "params": ["model_filename"],
            },
            "soil-loss": {
                "url": "soil-erosion/SoilLoss/model_filename_1991_2020_VHR-REA.nc",
                "params": ["model_filename"],
            },
            "rainfall-erosivity-anomalies": {
                "url": "soil-erosion/Rfactor-anomalies/model_filename_2021_2050_ass_1991_2020_VHR-PRO_regular.nc",
                "params": ["model_filename"],
            },
            "soil-loss-anomalies": {
                "url": "soil-erosion/SoilLoss-anomalies/model_filename_2021_2050_ass_1991_2020_VHR-PRO.nc",
                "params": ["model_filename"],
            },
        },
        "human-wellbeing": {
            "daily": {
                "url": "human-wellbeing/reanalysis/regular/indicator_year_daily_metric_VHR-REA_regular.nc",
                "params": ["indicator", "year", "daily_metric"],
            },
            "multi-year": {
                "url": "human-wellbeing/multiyear/regular/indicator_1989-2020_daily_metric_VHR-REA_multiyearmean.nc",
                "params": [
                    "indicator",
                    "daily_metric",
                ],
            },
            "anomalies": {
                "url": "human-wellbeing/anomalies/indicator_2021-2050vs1991-2020_daily_metric_VHR-PRO_time_period_ymean.nc",
                "params": ["indicator", "daily_metric", "time_period"],
            },
        },
        "era5-downscaled-over-italy": {
            "VHR-REA_IT_1981_2020": {
                "url": "climate_stripes/indicator_reference_period_monmean_time_period.nc",
                "params": ["indicator", "reference_period", "time_period"],
            },
        },
        "land-suitability-for-forests": {
            "bioclimatic-precipitations-hist": {
                "url": "land-suitability-for-forests/BIO_HIST_FINALI/indicator_edited2.nc",
                "params": ["indicator"],
            },
            "bioclimatic-precipitations-proj": {
                "url": "land-suitability-for-forests/BIO_PROJ/indicator_21_50.nc",
                "params": ["indicator"],
            },
            "bioclimatic-temperatures-hist": {
                "url": "land-suitability-for-forests/BIO_HIST_FINALI/indicator_edited2.nc",
                "params": ["indicator"],
            },
            "bioclimatic-temperatures-proj": {
                "url": "land-suitability-for-forests/BIO_PROJ/indicator_21_50.nc",
                "params": ["indicator"],
            },
            "forest-species-suitability-hist": {
                "url": "land-suitability-for-forests/SUIT_HIST/FOREST_HIST_SUITABILITY.nc",
            },
            "forest-species-suitability-proj": {
                "url": "land-suitability-for-forests/SUIT_PROJ/FOREST_FUTU_SUITABILITY.nc",
            },
        },
    }

    # list of product that doesn't have the time dimension in theirs nc files
    PRODUCT_WOUT_TIME = [
        "bioclimatic-precipitations-hist",
        "bioclimatic-precipitations-proj",
        "bioclimatic-temperatures-hist",
        "bioclimatic-temperatures-proj",
        "forest-species-suitability-hist",
        "forest-species-suitability-proj",
    ]

    # map for indicator and variables
    VARIABLES_MAP = {
        # soil erosion
        "RF": "rf",
        "SL": "sl",
        # human wellbeing
        "WC": "wc",
        "H": "h",
        "DI": "di",
        "AT": "at",
        # era5
        "T_2M": "T_2M",
        "TMAX_2M": "TMAX_2M",
        "TMIN_2M": "TMIN_2M",
        # suitability for forest
        "BIO1": "bio1",
        "BIO2": "bio2",
        "BIO3": "bio3",
        "BIO4": "bio4",
        "BIO5": "bio5",
        "BIO6": "bio6",
        "BIO7": "bio7",
        "BIO8": "bio8",
        "BIO9": "bio9",
        "BIO10": "bio10",
        "BIO11": "bio11",
        "BIO12": "bio12",
        "BIO13": "bio13",
        "BIO14": "bio14",
        "BIO15": "bio15",
        "BIO16": "bio16",
        "BIO17": "bio17",
        "BIO18": "bio18",
        "BIO19": "bio19",
        "Abies_alba": "Abies_alba",
        "Acer_campestre": "Acer_campestre",
        "Carpinus_betulus": "Carpinus_betulus",
        "Castanea_sativa": "Castanea_sativa",
        "Corylus_sp": "Corylus_sp",
        "Fagus_sylvatica": "Fagus_sylvatica",
        "Fraxinus_ornus": "Fraxinus_ornus",
        "Larix_decidua": "Larix_decidua",
        "Ostrya_carpinifolia": "Ostrya_carpinifolia",
        "Picea_abies": "Picea_abies",
        "Pinus_cembra": "Pinus_cembra",
        "Pinus_halepensis": "Pinus_halepensis",
        "Pinus_pinaster": "Pinus_pinaster",
        "Pinus_sylvestris": "Pinus_sylvestris",
        "Quercus_cerris": "Quercus_cerris",
        "Quercus_ilex": "Quercus_ilex",
        "Quercus_petraea": "Quercus_petraea",
        "Quercus_pubescens": "Quercus_pubescens",
        "Quercus_robur": "Quercus_robur",
        "Quercus_suber": "Quercus_suber",
    }

    # name of geoserver layers for the different datasets and their different products (needed to get the legend intervals)
    GEOSERVER_LAYER_MAP = {
        # for now are mapped only the products with legends not directly related to the single products
        "human-wellbeing": {
            "daily": {
                "layer": "highlander:indicator_year_daily_metric_VHR-REA_regular",
                "params": ["indicator", "year", "daily_metric"],
            },
            "multi-year": {
                "layer": "highlander:indicator_1989-2020_daily_metric_VHR-REA_multiyearmean",
                "params": [
                    "indicator",
                    "daily_metric",
                ],
            },
            "anomalies": {
                "layer": "highlander:indicator_anomalies_daily_metric_time_period",
                "params": ["indicator", "daily_metric", "time_period"],
            },
        },
        "land-suitability-for-forests": {
            "bioclimatic-precipitations-hist": {
                "layer": "highlander:indicator_1991_2020",
                "params": ["indicator"],
            },
            "bioclimatic-precipitations-proj": {
                "layer": "highlander:indicator_2021_2050",
                "params": ["indicator"],
            },
            "bioclimatic-temperatures-hist": {
                "layer": "highlander:indicator_1991_2020",
                "params": ["indicator"],
            },
            "bioclimatic-temperatures-proj": {
                "layer": "highlander:indicator_2021_2050",
                "params": ["indicator"],
            },
            "forest-species-suitability-hist": {
                "layer": "highlander:indicator_1991_2020",
                "params": ["indicator"],
            },
            "forest-species-suitability-proj": {
                "layer": "highlander:indicator_2021_2050",
                "params": ["indicator"],
            },
        },
        "era5-downscaled-over-italy": {
            "VHR-REA_IT_1981_2020": {
                "layer": "highlander:indicator_reference_period_monmean_time_period",
                "params": ["indicator", "reference_period", "time_period"],
            }
        },
    }

    # map of themes and level for cropped map
    MAP_STYLES = {
        "r-factor": {
            "colormap": "mpl.cm.viridis_r",
            "levels": [0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 6000, 8000, 10000],
        },
        "soil-loss": {
            "colormap": "mpl.cm.Oranges",
            "levels": [0, 1, 2.5, 5, 10, 50, 100, 500, 1000, 2000],
        },
        "rainfall-erosivity-anomalies": {
            "colormap": "mpl.cm.viridis",
            "levels": [
                -300,
                -250,
                -200,
                -150,
                -100,
                -50,
                0,
                50,
                100,
                150,
                200,
                250,
                300,
                350,
                400,
                450,
                500,
                550,
                600,
                650,
                700,
            ],
        },
        "soil-loss-anomalies": {
            "colormap": "mpl.cm.viridis",
            "levels": [
                -300,
                -250,
                -200,
                -150,
                -100,
                -50,
                0,
                50,
                100,
                150,
                200,
                250,
                300,
                350,
                400,
                450,
                500,
                550,
                600,
                650,
                700,
            ],
        },
        "apparent-temperature": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -30,
                -25,
                -20,
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
                40,
                45,
            ],  # 50,],
        },
        "discomfort-index-Thom": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -30,
                -25,
                -20,
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
                40,
                45,
            ],  # 50,],
        },
        "humidex": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -30,
                -25,
                -20,
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
                40,
                45,
            ],  # 50,],
        },
        "wind-chill": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -30,
                -25,
                -20,
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
                40,
                45,
            ],  # 50,],
        },
        "2m temperature": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
            ],
        },
        "2m maximum temperature": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
            ],
        },
        "2m minimum temperature": {
            "colormap": "mpl.cm.nipy_spectral",
            "levels": [
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
            ],
        },
        "bioclimatic-precipitations-hist": {
            # TODO
            "colormap": "mpl.cm.Blues",
            "levels": [50, 75, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500],
        },
        "bioclimatic-precipitations-proj": {
            # TODO
            "colormap": "mpl.cm.Blues",
            "levels": [50, 75, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500],
        },
        "bioclimatic-temperatures-hist": {
            # TODO
            "colormap": "mpl.cm.turbo",
            "levels": [
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
                40,
            ],
        },
        "bioclimatic-temperatures-proj": {
            # TODO
            "colormap": "mpl.cm.turbo",
            "levels": [
                -15,
                -10,
                -5,
                0,
                5,
                10,
                15,
                20,
                25,
                30,
                35,
                40,
            ],
        },
        "forest-species-suitability-hist": {
            # TODO
            "colormap": "mpl.cm.Greens",
            "levels": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        },
        "forest-species-suitability-proj": {
            # TODO
            "colormap": "mpl.cm.Greens",
            "levels": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        },
    }

    @staticmethod
    def getOutputFilename(
        output_type: str, plot_format: str, plot_type: str, area_name: str
    ) -> str:
        if output_type == "plot":
            if plot_format == "png":
                return (
                    f"{area_name.replace(' ', '_').lower()}_{plot_type}.{plot_format}"
                )
            else:
                return f"{area_name.replace(' ', '_').lower()}.{plot_format}"
        else:
            return f"{area_name.replace(' ', '_').lower()}_map.png"

    @staticmethod
    def getOutputPath(
        dataset_id: str, product_id: str, variables: Any
    ) -> Optional[List[str]]:
        # get the output structure
        try:
            if "all_products" in MapCropConfig.OUTPUT_STRUCTURE_MAP[dataset_id]:
                output_structure = [
                    variables[i]
                    for i in MapCropConfig.OUTPUT_STRUCTURE_MAP[dataset_id][
                        "all_products"
                    ]
                ]
            else:
                output_structure = [
                    variables[i]
                    for i in MapCropConfig.OUTPUT_STRUCTURE_MAP[dataset_id][product_id]
                ]
        except KeyError:
            return None

        return output_structure

    @staticmethod
    def getStripesOutputPath(
        area_name: str,
        indicator: str,
        reference_period: str,
        time_period: str,
        administrative: str,
    ):
        output_filename = f"{area_name.replace(' ', '_').lower()}_stripes.png"
        output_path = Path(indicator, reference_period, time_period, administrative)
        output_dir = Path(
            MapCropConfig.STRIPES_OUTPUT_ROOT, output_path
        )  # Needed to create the output folder if it does not exist.

        return output_dir, output_filename


class PlotUtils:
    @staticmethod
    def getLegendLevels(layer_name):
        log.debug(f"legends for layer {layer_name}")
        legend_levels: Optional[List[float]] = []
        get_legend_params = {
            "version": "1.1.1",
            "request": "GetLegendGraphic",
            "format": "application/json",
            "layer": layer_name,
        }
        maps_url = os.environ.get("MAPS_URL", None)
        if not maps_url:
            return legend_levels
        # get legends from geoserver
        r = requests.get(f"{maps_url}/highlander/wms", params=get_legend_params)
        if r.status_code != 200:
            log.warning(
                f"Get legend from geoserver request failed. Status code: {r.status_code}"
            )
            return legend_levels

        # parse the geoserver response
        response = r.json()
        try:
            legend_content = response["Legend"][0]["rules"][0]["symbolizers"][0][
                "Raster"
            ]["colormap"]["entries"]
        except KeyError:
            log.warning("Error in parsing geoserver response")
            return legend_levels

        # get the level intervals
        for entry in legend_content:
            quantity = entry["quantity"]
            try:
                float_quantity = float(quantity)
            except Exception:
                log.warning(f"quantity {quantity} cannot be typed as a float")
                continue
            legend_levels.append(float_quantity)

        log.debug(legend_levels)
        return legend_levels

    @staticmethod
    def getArea(area_id: str, administrative: str):
        # get the geojson file
        geojson_file = Path(MapCropConfig.GEOJSON_PATH, f"italy-{administrative}.json")
        areas = gpd.read_file(geojson_file)
        area_name = area_id.lower()

        # Get the area. Check if it exists and if it does not,then  raise an error.
        area = areas[areas["name"] == area_name]
        return area_name, area

    @staticmethod
    def cropArea(
        netcdf_path: Path,
        area_name: str,
        area: Any,
        data_variable: str,
        year_day: Optional[int] = "",
        has_time: bool = False,
        decode_time: bool = False,
    ) -> Any:
        # read the netcdf file
        data_to_crop = xr.open_dataset(netcdf_path, decode_times=decode_time)
        # data_to_crop = xr.open_dataset(netcdf_path)
        # rfactor projections have different names for lat lon --> rename the variables
        if "latitude" in data_to_crop.coords:
            data_to_crop = data_to_crop.rename({"latitude": "lat"})
        if "longitude" in data_to_crop.coords:
            data_to_crop = data_to_crop.rename({"longitude": "lon"})

        # create the polygon mask
        polygon_mask = regionmask.Regions(
            name=area_name,
            outlines=list(area.geometry.values[i] for i in range(0, area.shape[0])),
        )

        mask = polygon_mask.mask(data_to_crop, lat_name="lat", lon_name="lon")

        if year_day:
            # crop only the data related to the requested date. N.B. the related layer is day-1 (the 1st january is layer 0)
            nc_cropped = data_to_crop[data_variable][year_day - 1].where(
                mask == np.isnan(mask)
            )
        elif has_time:
            nc_cropped = data_to_crop[data_variable][0].where(mask == np.isnan(mask))
        else:
            nc_cropped = data_to_crop[data_variable].where(mask == np.isnan(mask))

        nc_cropped = nc_cropped.dropna("lat", how="all")
        nc_cropped = nc_cropped.dropna("lon", how="all")

        return nc_cropped

    @staticmethod
    def plotMapNetcdf(
        field: Any,
        lat: Any,
        lon: Any,
        units: Any,
        product: str,
        main_product: str,
        outputfile: Path,
        geoserver_layer: str,
    ) -> None:
        """
        This function plot with the xarray tool the field of netcdf
        """
        log.debug(f"plotting map on {outputfile}")
        fig1 = plt.figure(figsize=(15, 15))
        mpl.rcParams["font.size"] = 15

        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="The value of the smallest subnormal for <class 'numpy.float64'> type is zero",
            )
            ax1 = fig1.add_subplot(111, projection=ccrs.PlateCarree())

        ax1.set(frame_on=False)
        ax1.axis("off")
        ax1.set_xticks(ax1.get_xticks())
        ax1.set_yticks(ax1.get_yticks())
        ax1.add_feature(cartopy.feature.LAND)
        ax1.add_feature(cartopy.feature.OCEAN)
        ax1.add_feature(cartopy.feature.COASTLINE)
        ax1.add_feature(cartopy.feature.BORDERS, color="k", linestyle=":")
        ax1.add_feature(cartopy.feature.LAKES)
        ax1.add_feature(cartopy.feature.RIVERS, color="b")
        ax1.gridlines(
            crs=ccrs.PlateCarree(),
            draw_labels=True,
            linewidth=1,
            color="gray",
            alpha=0.5,
            linestyle="--",
        )
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="This usage of Quadmesh is deprecated: Parameters meshWidth and meshHeights will be removed; coordinates must be 2D; all parameters except coordinates will be keyword-only.",
            )
        try:
            levels: List[float] = []
            legend_product = main_product
            legend_product = main_product
            # log.debug(f"main product: {main_product}, product: {product}")
            if main_product not in MapCropConfig.MAP_STYLES.keys():
                # check if its legend is common with the one of the main product
                if product not in MapCropConfig.MAP_STYLES.keys():
                    raise ServerError(
                        f"plotting style not defined for product {main_product} (product long name: {product})"
                    )
                else:
                    legend_product = product

            cmap = eval(MapCropConfig.MAP_STYLES[legend_product]["colormap"])
            levels = []
            if geoserver_layer:
                try:
                    levels = PlotUtils.getLegendLevels(geoserver_layer)
                except Exception as e:
                    log.warning(f"unable to get levels from geoserver: {e}")
                    pass
            if not levels:
                # use the default
                levels = MapCropConfig.MAP_STYLES[legend_product]["levels"]
            norm = mpl.colors.BoundaryNorm(levels, cmap.N)

        except Exception as e:
            raise ServerError(f"Errors in passing data variable: {e}")

        fig1.colorbar(
            mpl.cm.ScalarMappable(cmap=cmap, norm=norm),
            ax=ax1,
            ticks=levels,
            spacing="uniform",
            orientation="vertical",
            label=f"{product} [{units}]",
            anchor=(0.5, 0.5),
            shrink=np.round(min(len(lon) / len(lat), len(lat) / len(lon)), 2),  # 0.8
        )
        ax1.pcolormesh(lon, lat, field, cmap=cmap, alpha=1, norm=norm)
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message='facecolor will have no effect as it has been defined as "never".',
            )
            fig1.savefig(
                outputfile, transparent=True, bbox_inches="tight", pad_inches=0
            )

    @staticmethod
    def plotBoxplot(field: Any, outputfile: Path) -> None:
        """
        This function plot with the xarray tool the field of netcdf
        """
        log.debug(f"plotting boxplot on {outputfile}")
        fig4, (ax4) = plt.subplots(
            1, 1, figsize=(15, 7)
        )  # len(field.lon)/100, len(field.lat)/100))
        sns.set_theme(style="ticks")
        sns.despine(fig4)
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="iteritems is deprecated and will be removed in a future version. Use .items instead.",
            )
            sns.boxplot(data=field, whis=[1, 99], showfliers=False, palette="Set3")

        ax4.xaxis.set_major_formatter(mpl.ticker.ScalarFormatter())
        mpl.rcParams["font.size"] = 14
        # TODO label not hardcoded
        # ax4.set_xlabel('R-factor')  # ,fontsize=14)
        # TODO this label to have not to be hardcoded or it's the same for all the boxplots?
        ax4.set_ylabel("Count")  # ,fontsize=14)
        ax4.tick_params(axis="both", which="major")  # , labelsize=14)
        ax4.tick_params(axis="both", which="minor")  # , labelsize = 14)

        fig4.savefig(outputfile)

    @staticmethod
    def plotDistribution(field: Any, outputfile: Path, name: str, units: str) -> None:
        """
        This function plot with the xarray tool the field of netcdf
        """
        fig3, (ax3) = plt.subplots(
            1, 1, figsize=(8, 5)
        )  # len(field.lon)/100, len(field.lat)/100))
        # sns.set_theme(style="ticks")
        # sns.despine(fig3)
        # log.debug(field.max())
        # sns.histplot(
        #    field,
        #    ax=ax3,
        #    edgecolor=".3",
        #    linewidth=0.5,
        # log_scale=True,
        # )
        field.plot.hist(grid=True, bins=20, rwidth=0.9, ax=ax3, color="#607c8e")
        ax3.xaxis.set_major_formatter(mpl.ticker.ScalarFormatter())
        mpl.rcParams["font.size"] = 14

        if units:
            ax3.set_xlabel(f"{name} ({units})", fontsize=16)
        else:
            ax3.set_xlabel(f"{name}", fontsize=16)
        ax3.set_ylabel("Count")  # ,fontsize=14)
        ax3.tick_params(axis="both", which="major")  # , labelsize=14)
        ax3.tick_params(axis="both", which="minor")  # , labelsize = 14)
        ax3.set_title(f'{field.columns[0].replace(".nc", "")} histogram (20 classes)')
        ax3.get_legend().remove()  # handles = legend.legendHandles
        # legend.remove()
        # ax3.legend(handles, ['dep-', 'ind-', 'ind+', 'dep+'], title='Stat.ind.')

        fig3.savefig(outputfile)

    @staticmethod
    def plotStripes(array, yearsList: list, region_id: str, fileOutput: str):
        region_id = f"{region_id.replace('_', ' ').title()}"
        fig, ax = plt.subplots(figsize=(20, 8))
        fig.subplots_adjust(bottom=0.25, left=0.25)  # make room for labels
        mpl.rcParams["font.size"] = 25
        min_val = math.floor(array.min())  # np.round(array.min()*10)/10
        max_val = math.ceil(array.max())  # np.round(array.max()*10)/10
        stripes = plt.pcolormesh(array, vmin=min_val, vmax=max_val, cmap="bwr")
        plt.colorbar(stripes, label="Air temperature [°C]")
        ax.set_title(region_id, alpha=1)
        ax.set_xticks(np.arange(array.shape[1]) + 0.5, minor=False)
        ax.set_xticklabels(yearsList, rotation=90, size=15)
        ax.axes.get_yaxis().set_visible(False)
        plt.show()
        fig.savefig(fileOutput, transparent=True, bbox_inches="tight", pad_inches=0)
