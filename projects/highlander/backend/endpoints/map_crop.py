from pathlib import Path
from typing import Optional

import cartopy
import cartopy.crs as ccrs
import geopandas as gpd
import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import regionmask
import seaborn as sns
import xarray as xr
from flask import send_file
from restapi import decorators
from restapi.exceptions import NotFound
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import User
from restapi.utilities.logs import log

ADMINISTRATIVE_AREAS = ["regions", "provinces"]
OUTPUT_TYPES = ["map", "plot"]

# TODO definire i percorsi files "definitivi"
GEOJSON_PATH = "/code/highlander/geoserver_data_fake/geojson_assets"
DATASETS_ROOT = (
    "/code/highlander/geoserver_data_fake"  # TODO le mappe sono in data/geoserver ?
)
# OUTPUT_ROOT = tempfile.gettempdir()
# for debugging
OUTPUT_ROOT = "/code/highlander/geoserver_data_fake"


def plotMapNetcdf(field, lat, lon, outputfile):
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig1 = plt.figure(figsize=(18, 18))
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
    cmesh = ax1.pcolormesh(lon, lat, field, cmap="viridis")  # ,vmin=0,vmax=10000)
    fig1.colorbar(
        cmesh, ax=ax1, shrink=np.round(min(len(lon) / len(lat), len(lat) / len(lon)), 2)
    )
    fig1.savefig(outputfile, transparent=True)


def plotBoxplot(field, outputfile):
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig4, (ax4) = plt.subplots(
        1, 1, figsize=(15, 7)
    )  # len(field.lon)/100, len(field.lat)/100))
    sns.set_theme(style="ticks")
    sns.despine(fig4)
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


def plotDistribution(field, outputfile):
    """
    This function plot with the xarray tool the field of netcdf
    """
    fig3, (ax3) = plt.subplots(
        1, 1, figsize=(3, 8)
    )  # len(field.lon)/100, len(field.lat)/100))
    sns.set_theme(style="ticks")
    sns.despine(fig3)
    sns.histplot(
        field,
        ax=ax3,
        edgecolor=".3",
        linewidth=0.5,
        log_scale=True,
    )
    ax3.xaxis.set_major_formatter(mpl.ticker.ScalarFormatter())
    mpl.rcParams["font.size"] = 14

    # TODO label not hardcoded
    # ax3.set_xlabel('R-factor')  # ,fontsize=14)
    # TODO this label to have not to be hardcoded or it's the same for all the boxplots?
    ax3.set_ylabel("Count")  # ,fontsize=14)
    ax3.tick_params(axis="both", which="major")  # , labelsize=14)
    ax3.tick_params(axis="both", which="minor")  # , labelsize = 14)

    fig3.savefig(outputfile)


def cropArea(netcdf_path, area_name, area):
    # read the netcdf file
    data_to_crop = xr.open_dataset(netcdf_path)

    # create the polygon mask
    polygon_mask = regionmask.Regions(
        name=area_name,
        outlines=list(area.geometry.values[i] for i in range(0, area.shape[0])),
    )
    mask = polygon_mask.mask(data_to_crop, lat_name="lat", lon_name="lon")

    # TODO risalire al nome della variabile leggendola dal netcdf
    data_variable = "rf"

    nc_cropped = data_to_crop[data_variable][0].where(mask == np.isnan(mask))
    nc_cropped = nc_cropped.dropna("lat", how="all")
    nc_cropped = nc_cropped.dropna("lon", how="all")
    return nc_cropped


class SubsetDetails(Schema):
    model_id = fields.Str(required=True)
    area_type = fields.Str(required=True, validate=validate.OneOf(ADMINISTRATIVE_AREAS))
    area_id = fields.Str(required=True)
    output_type = fields.Str(required=True, validate=validate.OneOf(OUTPUT_TYPES))


class MapCrop(EndpointResource):
    @decorators.auth.require()
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/subset",
        summary="Create a subset of data",
        responses={
            200: "Cropping successfully created",
            404: "Requested area not found",
        },
    )
    @decorators.use_kwargs(SubsetDetails)
    def post(
        self,
        user: User,
        dataset_id: str,
        product_id: str,
        model_id: str,
        area_type: str,
        area_id: str,
        output_type: str,
    ) -> Response:

        geojson_file = Path(GEOJSON_PATH, f"italy-{area_type}.json")
        areas = gpd.read_file(geojson_file)

        if area_type == "regions":
            area_name = area_id.lower()
            area_index = "name"
        else:
            area_name = area_id.title()
            area_index = "prov_name"

        # TODO è ok usare una struttura file simile? oppure ci basta il filename con scritto tutto dentro?
        output_dir = Path(
            OUTPUT_ROOT, dataset_id, product_id, model_id, f"{output_type}s"
        )
        output_filename = f"{area_name.replace(' ','_').lower()}.png"
        if output_dir.is_dir():
            # check if the images already exists
            for im in output_dir.iterdir():
                if (
                    im.is_file()
                    and output_filename == im.name
                    and im.stat().st_size >= 1
                ):
                    res = im.name
                    return res

        area = areas[areas[area_index] == area_name]

        if area.empty:
            raise NotFound(f"Area {area_id} not found in {area_type}")

        # get the map to crop
        dataset_dir = Path(DATASETS_ROOT, dataset_id)
        if not dataset_dir.is_dir():
            raise NotFound(f"{dataset_id} not found")

        # get the file corresponding to the requested model
        data_to_crop_path: Optional[Path] = None
        for f in dataset_dir.iterdir():
            if f.is_file and f.suffix == ".nc":
                if model_id in f.name:
                    data_to_crop_path = f
                    break
        if not data_to_crop_path:
            raise NotFound(
                f"Not found a map for {model_id} model and product {product_id}"
            )

        nc_cropped = cropArea(data_to_crop_path, area_name, area)

        # define the output directory
        if not output_dir.is_dir():
            # create it
            output_dir.mkdir(parents=True, exist_ok=True)
        output_filepath = Path(output_dir, output_filename)

        if output_type == "map":
            # plot the cropped map
            plotMapNetcdf(
                nc_cropped.values,
                nc_cropped.lat.values,
                nc_cropped.lon.values,
                output_filepath,
            )
        else:
            # plot the boxplot
            df_stas = pd.DataFrame([])
            df_stas = pd.concat(
                [
                    df_stas,
                    pd.DataFrame(
                        np.array(nc_cropped.values).ravel(),
                        columns=[str(data_to_crop_path)[:-21]],
                    ),
                ],
                axis=1,
            )
            # boxplot
            plotBoxplot(df_stas, output_filepath)
            # distribution
            # plotDistribution(df_stas, output_filepath)

        res = output_filename
        return res

    @decorators.auth.require()
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/subset",
        summary="Get a subset of data",
        responses={
            200: "subset successfully retrieved",
            404: "Requested detail not found",
        },
    )
    @decorators.use_kwargs(
        {
            "model_id": fields.Str(required=True),
            "area_id": fields.Str(required=True),
            "output_type": fields.Str(
                required=True, validate=validate.OneOf(OUTPUT_TYPES)
            ),
        },
        location="query",
    )
    def get(
        self,
        user: User,
        dataset_id: str,
        product_id: str,
        model_id: str,
        area_id: str,
        output_type: str,
    ) -> Response:
        output_dir = Path(
            OUTPUT_ROOT, dataset_id, product_id, model_id, f"{output_type}s"
        )
        if not output_dir.is_dir():
            raise NotFound(
                f"details for product {product_id} and model {model_id} not found"
            )
        filename = f"{area_id.replace(' ','_').lower()}.png"
        filepath = Path(output_dir, filename)

        if not filepath.is_file():
            raise NotFound(f"subset element for {area_id} not found")

        return send_file(filepath, mimetype="image/png")
