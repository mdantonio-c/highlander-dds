import datetime
import os
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import cartopy  # type: ignore
import cartopy.crs as ccrs  # type: ignore
import geopandas as gpd  # type: ignore
import matplotlib as mpl  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import numpy as np
import pandas as pd  # type: ignore
import regionmask  # type: ignore
import seaborn as sns  # type: ignore
import xarray as xr  # type: ignore
from flask import send_file
from highlander.connectors import broker
from marshmallow import ValidationError, pre_load
from matplotlib import cm
from restapi import decorators
from restapi.connectors import Connector
from restapi.exceptions import BadRequest, NotFound, ServerError
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.utilities.logs import log

AREA_TYPES = ["regions", "provinces", "bbox", "polygon"]
DAILY_METRICS = ["daymax", "daymin", "daymean"]
TYPES = ["map", "plot"]
PLOT_TYPES = ["boxplot", "distribution"]
FORMATS = ["png", "json"]


GEOJSON_PATH = "/catalog/assets"

# set the cartopy data_dir
cartopy.config["data_dir"] = os.getenv(
    "CARTOPY_DATA_DIR", cartopy.config.get("data_dir")
)

PRODUCT_EXCEPTION = {
    "human-wellbeing": {"multi-year": "daily"},
    "land-suitability-for-forests": {
        "bioclimatic-precipitations": "bioclimatic-variables",
        "bioclimatic-temperatures": "bioclimatic-variables",
    },
}

CROPS_OUTPUT_ROOT = Path("/catalog/crops/")

# variable used for the cases where the model name and the file name does not match
MODELS_MAPPING = {"RF": "R"}

# mandatory params for the different datasets and their different products
MANDATORY_PARAM_MAP = {
    "soil-erosion": {"all_products": ["model_id"]},
    "human-wellbeing": {"all_products": ["daily_metric"], "daily": ["year", "date"]},
    "era5-downscaled-over-italy": {"all_products": ["time_period"]},
    "land-suitability-for-forests": {"all_products": ["indicator"]},
}

# output structure for the different datasets and their different products
OUTPUT_STRUCTURE_MAP = {
    "soil-erosion": {
        "all_products": ["dataset_id", "product_id", "model_id", "area_type"]
    },
    "human-wellbeing": {
        "daily": ["dataset_id", "product_id", "indicator", "year", "date", "area_type"],
        "multi-year": ["dataset_id", "product_id", "indicator", "area_type"],
    },
    "era5-downscaled-over-italy": {
        "all_products": ["dataset_id", "product_id", "time_period", "area_type"],
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
    },
    "human-wellbeing": {
        "daily": {
            "url": "human-wellbeing/regular/indicator_year_daily_metric_VHR-REA_regular.nc",
            "params": ["indicator", "year", "daily_metric"],
        },
        "multi-year": {
            "url": "human-wellbeing/multiyear/regular/indicator_1989-2020_daily_metric_VHR-REA_multiyearmean.nc",
            "params": [
                "indicator",
                "daily_metric",
            ],
        },
    },
    "era5-downscaled-over-italy": {
        "VHR-REA_IT_1989_2020": {
            "url": "climate_stripes/T_2M_1989-2020_time_period_avg.nc",
            "params": ["time_period"],
        },
    },
    "land-suitability-for-forests": {
        "bioclimatic-precipitations": {
            "url": "land-suitability-for-forests/BIO_HIST_FINALI/indicator_edited2.nc",
            "params": ["indicator"],
        },
        "bioclimatic-temperatures": {
            "url": "land-suitability-for-forests/BIO_HIST_FINALI/indicator_edited2.nc",
            "params": ["indicator"],
        },
        "forest-species-suitability": {
            "url": "land-suitability-for-forests/FOREST_HIST_SUITABILITY.nc",
        },
    },
}

# list of product that doesn't have the time dimension in theirs nc files
PRODUCT_WOUT_TIME = [
    "bioclimatic-precipitations",
    "bioclimatic-temperatures",
    "forest-species-suitability",
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
    "bioclimatic-precipitations": {
        # TODO
        "colormap": "mpl.cm.Blues",
        "levels": [50, 75, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500],
    },
    "bioclimatic-temperatures": {
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
    "forest-species-suitability": {
        # TODO
        "colormap": "mpl.cm.Greens",
        "levels": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    },
}


def plotMapNetcdf(
    field: Any,
    lat: Any,
    lon: Any,
    units: Any,
    product: str,
    main_product: str,
    outputfile: Path,
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
        legend_product = product
        if product not in MAP_STYLES.keys():
            # check if its legend is common with the one of the main product
            if main_product not in MAP_STYLES.keys():
                raise ServerError(
                    f"plotting style not defined for product {product} (product id: {main_product})"
                )
            else:
                legend_product = main_product

        cmap = eval(MAP_STYLES[legend_product]["colormap"])
        levels = MAP_STYLES[legend_product]["levels"]
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
        fig1.savefig(outputfile, transparent=True, bbox_inches="tight", pad_inches=0)


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


def plotDistribution(field: Any, outputfile: Path, name: Any) -> None:
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig3, (ax3) = plt.subplots(
        1, 1, figsize=(8, 3)
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

    # TODO label not hardcoded
    # ax3.set_xlabel('R-factor')  # ,fontsize=14)
    # TODO this label to have not to be hardcoded or it's the same for all the boxplots?
    ax3.set_xlabel(f"{name}")
    ax3.set_ylabel("Count")  # ,fontsize=14)
    ax3.tick_params(axis="both", which="major")  # , labelsize=14)
    ax3.tick_params(axis="both", which="minor")  # , labelsize = 14)
    ax3.set_title(f'{field.columns[0].replace(".nc", "")} histogram')
    ax3.get_legend().remove()  # handles = legend.legendHandles
    # legend.remove()
    # ax3.legend(handles, ['dep-', 'ind-', 'ind+', 'dep+'], title='Stat.ind.')

    fig3.savefig(outputfile)


def cropArea(
    netcdf_path: Path,
    area_name: str,
    area: Any,
    data_variable: str,
    has_time: bool,
    year_day: Optional[int],
) -> Any:
    # read the netcdf file
    data_to_crop = xr.open_dataset(netcdf_path)

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


class SubsetDetails(Schema):
    model_id = fields.Str(required=False)
    year = fields.Str(required=False)
    date = fields.Str(required=False)
    area_id = fields.Str(required=False)
    area_type = fields.Str(required=True, validate=validate.OneOf(AREA_TYPES))
    area_coords = fields.List(fields.Float(), required=False)
    indicator = fields.Str(required=True)
    daily_metric = fields.Str(required=False, validate=validate.OneOf(DAILY_METRICS))
    time_period = fields.Str(required=False)
    type = fields.Str(required=True, validate=validate.OneOf(TYPES))
    plot_type = fields.Str(required=False, validate=validate.OneOf(PLOT_TYPES))
    plot_format = fields.Str(required=False, validate=validate.OneOf(FORMATS))

    @pre_load
    def params_validation(
        self, data: Dict[str, Union[str, list[float]]], **kwargs: Any
    ) -> Dict[str, Union[str, list[float]]]:
        area_type = data.get("area_type")
        area_coords = data.get("area_coords", None)
        area_id = data.get("area_id", None)
        # check if area coords are needed
        if area_type == "bbox" or area_type == "polygon":
            if not area_coords:
                raise ValidationError(
                    f"coordinates have to be specified for {area_type} area type"
                )
        # check if area_id is needed
        elif area_type == "regions" or area_type == "provinces":
            if not area_id:
                raise ValidationError(
                    f"an area id has to be specified for {area_type} area type"
                )

        # check if plot type is needed. A plot type has to be specified only if the requested output is a png
        type = data.get("type")
        plot_type = data.get("plot_type", None)
        plot_format = data.get("plot_format", None)
        if not plot_format or plot_format == "png":
            if type == "plot" and not plot_type:
                raise ValidationError("a plot type have to be specified")

        return data


class MapCrop(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/crop",
        summary="Get a subset of data",
        responses={
            200: "subset successfully retrieved",
            400: "missing parameters to get the file to crop",
            404: "Area or model not found",
            500: "Errors in cropping or plotting the data",
        },
    )
    @decorators.use_kwargs(
        SubsetDetails,
        location="query",
    )
    def get(
        self,
        dataset_id: str,
        product_id: str,
        area_type: str,
        type: str,
        indicator: str,
        model_id: Optional[str] = None,
        year: Optional[str] = None,
        date: Optional[str] = None,
        daily_metric: Optional[str] = None,
        time_period: Optional[str] = None,
        area_id: Optional[str] = None,
        area_coords: Optional[List[float]] = None,
        plot_type: Optional[str] = None,
        plot_format: str = "png",
    ) -> Any:

        dds = broker.get_instance()
        # check if the dataset exists
        dataset_details = dds.get_dataset_details([dataset_id])
        if not dataset_details["data"]:
            raise NotFound(f"dataset {dataset_id} not found")

        # check if product exists
        dataset_products = dataset_details["data"][0]["products"]
        product_details: Optional[Dict[str, Any]] = None
        for p in dataset_products:
            if product_id in p["id"]:
                product_details = p
                break
            # check if there are exception for the product
            if (
                dataset_id in PRODUCT_EXCEPTION.keys()
                and product_id in PRODUCT_EXCEPTION[dataset_id].keys()
                and p["id"] == PRODUCT_EXCEPTION[dataset_id][product_id]
            ):
                product_details = p
                break
            # # case of humanwellbeing multi-year: product not in dds but its details are the same of the daily
            # if (
            #     dataset_id == "human-wellbeing"
            #     and product_id == "multi-year"
            #     and p["id"] == "daily"
            # ):
            #     product_details = p
            #     break
        if not product_details:
            raise NotFound(f"product {product_id} for dataset {dataset_id} not found")

        # check mandatory params according to dataset and product
        endpoint_arguments = locals()
        if dataset_id in MANDATORY_PARAM_MAP.keys():
            for product, param_list in MANDATORY_PARAM_MAP[dataset_id].items():
                if product == product_id or product == "all_products":
                    for param in param_list:
                        if not endpoint_arguments[param]:
                            raise BadRequest(
                                f"{param} parameter is needed for {product_id} product in {dataset_id}"
                            )
        else:
            raise ServerError(f"{dataset_id} not found in Mandatory param map")

        year_day: Optional[int] = None
        if date and product == "daily":
            year_day = int(datetime.datetime.strptime(date, "%Y-%m-%d").strftime("%j"))

        if area_type == "regions" or area_type == "provinces":
            # get the geojson file
            geojson_file = Path(GEOJSON_PATH, f"italy-{area_type}.json")
            areas = gpd.read_file(geojson_file)

            area_name = area_id.lower()

            # get the path of the crop
            # get the output structure according to the dataset and the product
            try:
                if "all_products" in OUTPUT_STRUCTURE_MAP[dataset_id]:
                    output_structure = [
                        endpoint_arguments[i]
                        for i in OUTPUT_STRUCTURE_MAP[dataset_id]["all_products"]
                    ]
                else:
                    output_structure = [
                        endpoint_arguments[i]
                        for i in OUTPUT_STRUCTURE_MAP[dataset_id][product_id]
                    ]
            except KeyError:
                raise ServerError(
                    f"{dataset_id} or {product_id} keys not present in output structure map"
                )

            output_dir = CROPS_OUTPUT_ROOT.joinpath(*output_structure)
            log.debug(f"Output dir: {output_dir}")

            if type == "plot":
                if plot_format == "png":
                    output_filename = f"{area_name.replace(' ', '_').lower()}_{plot_type}.{plot_format}"
                else:
                    output_filename = (
                        f"{area_name.replace(' ', '_').lower()}.{plot_format}"
                    )
            else:
                output_filename = f"{area_name.replace(' ', '_').lower()}_map.png"

            filepath = Path(output_dir, output_filename)
            # get the mimetype
            if filepath.suffix == ".png":
                mimetype = "image/png"
            elif filepath.suffix == ".json":
                mimetype = "application/json"

            # check if the crop has already been created
            if filepath.is_file() and filepath.stat().st_size >= 1:
                return send_file(filepath, mimetype=mimetype)

            # get the area
            area = areas[areas["name"] == area_name]
            if area.empty:
                raise NotFound(f"Area {area_name} not found in {area_type}")

            # get the map to crop
            # check if the model name and the filename correspond
            if model_id:
                model_filename: str = model_id
                for m, v in MODELS_MAPPING.items():
                    if m in model_id:
                        model_filename = model_id.replace(m, v)

            # get the file urlpath
            product_urlpath = dds.broker.catalog[dataset_id][
                product_details["id"]
            ].urlpath
            log.debug(product_urlpath)
            product_urlpath_root = product_urlpath.split(dataset_id)[0]
            if dataset_id == "era5-downscaled-over-italy":
                product_urlpath_root = product_urlpath.split("vhr-rea")[0]
            log.debug(product_urlpath_root)
            try:
                data_to_crop_url = f"{product_urlpath_root}{SOURCE_FILE_URL_MAP[dataset_id][product_id]['url']}"
            except KeyError:
                raise ServerError(
                    f"{dataset_id} or {product_id} keys not present in source file url map"
                )
            # substitute the parameters
            endpoint_variables = locals()
            if "params" in SOURCE_FILE_URL_MAP[dataset_id][product_id]:
                for p in SOURCE_FILE_URL_MAP[dataset_id][product_id]["params"]:
                    data_to_crop_url = data_to_crop_url.replace(
                        p, endpoint_variables[p]
                    )

            data_to_crop_filepath = Path(data_to_crop_url)

            if not data_to_crop_filepath.is_file():
                raise NotFound(
                    f"Requested data to crop not found: source file {data_to_crop_filepath} does not exists"
                )
            log.debug(f"source path of the data to crop: {data_to_crop_filepath}")

            # get the data variable. The data variable is ALWAYS equal to the lowercase indicator
            try:
                nc_variable = VARIABLES_MAP[indicator]
            except KeyError:
                raise NotFound(
                    f"indicator {indicator} for product {product_id} for dataset {dataset_id} not found"
                )
            # crop the area
            try:
                has_time = True
                if product_id in PRODUCT_WOUT_TIME:
                    has_time = False

                nc_cropped = cropArea(
                    data_to_crop_filepath,
                    area_name,
                    area,
                    nc_variable,
                    has_time,
                    year_day,
                )
            except Exception as exc:
                raise ServerError(f"Errors in cropping the data: {exc}")
            # create the output directory if it does not exists
            if not output_dir.is_dir():
                output_dir.mkdir(parents=True, exist_ok=True)
            try:
                if type == "map":
                    # plot the cropped map
                    plotMapNetcdf(
                        nc_cropped.values,
                        nc_cropped.lat.values,
                        nc_cropped.lon.values,
                        nc_cropped.units,
                        nc_cropped.long_name,
                        product_id,
                        filepath,
                    )
                else:
                    # plot the boxplot
                    df_stas = pd.DataFrame([])
                    df_stas = pd.concat(
                        [
                            df_stas,
                            pd.DataFrame(
                                np.array(nc_cropped.values).ravel(),
                                columns=[
                                    str(product_id)
                                ],  # data_to_crop_filepath)[:-21]],
                            ),
                        ],
                        axis=1,
                    )
                    log.debug("Colums")
                    log.debug(df_stas.columns[0][-4:])

                    if plot_format == "json":
                        df_stas.to_json(path_or_buf=filepath)
                        return send_file(filepath, mimetype=mimetype)

                    # if not json plot the image
                    if plot_type == "boxplot":
                        plotBoxplot(df_stas, filepath)
                    elif plot_type == "distribution":
                        plotDistribution(df_stas, filepath, nc_cropped.long_name)

            except Exception as exc:
                raise ServerError(f"Errors in plotting the data: {exc}")

            # check that the output has been correctly created
            if not filepath.is_file() or not filepath.stat().st_size >= 1:
                raise ServerError("Errors in plotting the data")

            return send_file(filepath, mimetype=mimetype)

        else:
            # case of custom areas:
            # The data are cropped and streamed. Cropped data are not saved in the folders and
            # TODO: to be implemented
            log.debug("Custom area cropping")
            return self.empty_response()
