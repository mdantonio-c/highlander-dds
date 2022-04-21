import glob
import os
import tempfile
from pathlib import Path
from typing import Optional

import cartopy  # TO INSTALL --> OK
import cartopy.crs as ccrs  # TO INSTALL --> OK
import geopandas as gpd  # TO INSTALL --> OK
import matplotlib as mpl  # TO INSTALL --> OK
import matplotlib.pyplot as plt  # TO INSTALL --> OK
import numpy as np
import pandas as pd
import regionmask  # TO INSTALL --> OK
import seaborn as sns  # TO INSTALL --> OK
import xarray as xr
from matplotlib import colorbar, colors  # TO INSTALL --> OK
from mpl_toolkits.axes_grid1.inset_locator import inset_axes  # TO INSTALL --> OK
from restapi import decorators
from restapi.exceptions import NotFound
from restapi.models import fields, validate
from restapi.rest.definition import EndpointResource, Response
from restapi.services.authentication import User
from restapi.utilities.logs import log

# TODO manage all the installations in the dockerfile


ADMINISTRATIVE_AREAS = ["regions", "provinces"]

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
    # TODO fix bug sulle legende che non si vedono complete

    fig1, (ax1) = plt.subplots(figsize=(len(lon) / 10, len(lat) / 10))
    ax1.set(frame_on=False)
    ax1.axis("off")
    cbar = colorbar.ColorbarBase(
        ax1, cmap=plt.get_cmap("viridis"), norm=colors.Normalize(vmin=500, vmax=10000)
    )
    ax1 = plt.axes(projection=ccrs.PlateCarree())
    ax1.set_xticks(ax1.get_xticks())
    ax1.set_yticks(ax1.get_yticks())
    ax1.add_feature(cartopy.feature.LAND)
    ax1.add_feature(cartopy.feature.OCEAN)
    ax1.add_feature(cartopy.feature.COASTLINE)
    ax1.add_feature(cartopy.feature.BORDERS, linestyle=":")
    ax1.add_feature(cartopy.feature.LAKES, alpha=0.5)
    ax1.add_feature(cartopy.feature.RIVERS)
    ax1.gridlines(
        crs=ccrs.PlateCarree(),
        draw_labels=True,
        linewidth=2,
        color="gray",
        alpha=0.5,
        linestyle="--",
    )
    plt.pcolormesh(lon, lat, field, cmap="viridis", vmin=0, vmax=10000)
    axins = inset_axes(
        ax1,
        width="2.5%",  # width = 5% of parent_bbox width
        height="100%",  # height : 50%
        loc="lower left",
        bbox_to_anchor=(1.1, 0.0, 1, 1),
        bbox_transform=ax1.transAxes,
        borderpad=0,
    )
    plt.colorbar(cax=axins)
    fig1.savefig(outputfile, transparent=True)

def plotMapNetcdf(field, lat, lon, outputfile):
    """
    This function plot with the xarray tool the field of netcdf
    """
    #fig1, (ax1) = plt.subplots(figsize=(len(lon)/100, len(lat)/100))
    fig1 = plt.figure(figsize=(18,18))
    ax1 = fig1.add_subplot(111, projection=ccrs.PlateCarree())
    ax1.set(frame_on=False)
    ax1.axis('off')
    ax1.set_xticks(ax1.get_xticks())
    ax1.set_yticks(ax1.get_yticks())
    ax1.add_feature(cartopy.feature.LAND)
    ax1.add_feature(cartopy.feature.OCEAN)
    ax1.add_feature(cartopy.feature.COASTLINE)
    ax1.add_feature(cartopy.feature.BORDERS, color='k', linestyle=':')
    ax1.add_feature(cartopy.feature.LAKES)
    ax1.add_feature(cartopy.feature.RIVERS, color='b')
    ax1.gridlines(
        crs=ccrs.PlateCarree(),
        draw_labels=True,
        linewidth=1,
        color='gray',
        alpha=0.5,
        linestyle='--'
    )
    cmesh = ax1.pcolormesh(lon, lat, field ,cmap='hsv')#,vmin=0,vmax=10000)
    fig1.colorbar(cmesh, ax=ax1, shrink=np.round(min(len(lon)/len(lat),len(lat)/len(lon)),2))
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


class MapDetails(EndpointResource):
    @decorators.auth.require()
    @decorators.endpoint(
        path="/map/<dataset_id>/details",
        summary="Create a cropped map and its boxplot",
        responses={
            200: "Map details successfully created",
            404: "Requested area not found",
        },
    )
    @decorators.use_kwargs(
        {
            "model_id": fields.Str(required=True),
            "area_type": fields.Str(
                required=True, validate=validate.OneOf(ADMINISTRATIVE_AREAS)
            ),
            "area_id": fields.Str(required=True),
        },
        location="query",
    )
    def post(
        self, dataset_id: str, user: User, model_id: str, area_type: str, area_id: str
    ) -> Response:
        # TODO check if the image already exists

        geojson_file = Path(GEOJSON_PATH, f"italy-{area_type}.json")
        areas = gpd.read_file(geojson_file)

        if area_type == "regions":
            area_name = area_id.lower()
            area_index = "name"
        else:
            area_name = area_id.title()
            area_index = "prov_name"

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
                f"Not found a map for {model_id} model in {dataset_id} dataset"
            )

        # read the netcdf file
        data_to_crop = xr.open_dataset(data_to_crop_path)

        # create the polygon mask
        polygon_mask = regionmask.Regions(
            name=area_name,
            outlines=list(area.geometry.values[i] for i in range(0, area.shape[0])),
        )
        mask = polygon_mask.mask(data_to_crop, lat_name="lat", lon_name="lon")

        ID_COUNTRY = 0
        lat = mask.lat.values
        lon = mask.lon.values

        #id_lon = lon[np.where(~np.all(np.isnan(mask), axis=0))]
        #id_lat = lat[np.where(~np.all(np.isnan(mask), axis=1))]
        nc_cropped = ds[nc_var][0].where(sel_mask==np.isnan(sel_mask))
        nc_cropped = nc_cropped.dropna('lat', how='all')
        nc_cropped = nc_cropped.dropna('lon', how='all')
        # crop the data
        #nc_cropped = (
        #    data_to_crop.sel(
        #        lat=slice(id_lat[0], id_lat[-1]), lon=slice(id_lon[0], id_lon[-1])
        #    )
        #    .compute()
        #    .where(mask == ID_COUNTRY)
        #)

        # define the output directory
        # TODO è ok usare una struttura file simile? oppure ci basta il filename con scritto tutto dentro?
        output_dir = Path(OUTPUT_ROOT, dataset_id, model_id)
        if not output_dir.is_dir():
            # create it
            output_dir.mkdir(parents=True, exist_ok=True)
        output_map_filename = f"{dataset_id}_{model_id}_{area_name}_map.png"
        output_map_filepath = Path(output_dir, output_map_filename)

        # plot the cropped map
        # TODO risalire al nome della variabile leggendola dal netcdf
        data_variable = "rf"
        plotMapNetcdf(
                nc_cropped.values,
                nc_cropped.lat.values,
                nc_cropped.lon.values,
                output_map_filepath)

        # plot the boxplot
        output_boxplot_filename = f"{dataset_id}_{model_id}_{area_name}_boxplot.png"
        output_boxplot_filepath = Path(output_dir, output_boxplot_filename)
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

        # plotBoxplot(df_stas, output_boxplot_filepath)

        # plot the distribution
        output_distribution_filename = (
            f"{dataset_id}_{model_id}_{area_name}_distribution.png"
        )
        output_plot_filepath = Path(output_dir, output_distribution_filename)
        plotDistribution(np.array(nc_cropped.values).ravel(), output_plot_filepath)
