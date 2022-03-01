#!/usr/bin/env python
import argparse
import glob
import os
import warnings

import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import regionmask
import xarray as xr

# get_ipython().system('pwd')
# path = '/home/michele/radar-precipitation/nc_dir/'


warnings.filterwarnings(action="ignore")


parser = argparse.ArgumentParser(argument_default=0)
parser.add_argument("--PATH", "-p", help="Path input dir")  # , type=int)
parser.add_argument("--SHP", "-s", help="Shapefile name")  # , type=int)
args = parser.parse_args()

path = args.PATH
shapefile = args.SHP
print(path)
print(shapefile)
PATH_TO_SHAPEFILE = path + shapefile  # 'Italy_boundaries.shp'

os.chdir(path)

countries = gpd.read_file(PATH_TO_SHAPEFILE)
countries.head()
my_list = list(countries["CNTR_ID"])
my_list_unique = set(list(countries["CNTR_ID"]))
indexes = [my_list.index(x) for x in my_list_unique]
list_nc = glob.glob("*.nc")
for data in list_nc:
    # data = 'r-factor_r1_regrid_v2_seconds.nc'
    dataset = path + data
    ds = xr.open_dataset(dataset)
    len(list(countries.geometry.values[i] for i in indexes))
    len(list(countries.CNTR_ID[indexes]))
    len(indexes)
    a = range(0, countries.shape[0])

    countries_mask_poly = regionmask.Regions(
        name="CNTR_ID",
        numbers=indexes,
        names=countries.CNTR_ID[indexes],
        abbrevs=countries.CNTR_ID[indexes],
        outlines=list(
            countries.geometry.values[i] for i in range(0, countries.shape[0])
        ),
    )
    countries_mask_poly
    mask = countries_mask_poly.mask(ds, lat_name="latitude", lon_name="longitude")

    # plt.figure(figsize=(16,8))
    # ax = plt.axes()
    # mask.plot(ax = ax)
    # countries.plot(ax = ax, alpha = 0.8, facecolor = 'none', lw = 1)

    ID_COUNTRY = 0
    print(countries.CNTR_ID[ID_COUNTRY])
    lat = mask.latitude.values
    lon = mask.longitude.values
    sel_mask = mask.where(mask == ID_COUNTRY).values
    id_lon = lon[np.where(~np.all(np.isnan(sel_mask), axis=0))]
    id_lat = lat[np.where(~np.all(np.isnan(sel_mask), axis=1))]

    out_sel1 = (
        ds.sel(
            latitude=slice(id_lat[0], id_lat[-1]),
            longitude=slice(id_lon[0], id_lon[-1]),
        )
        .compute()
        .where(mask == ID_COUNTRY)
    )

    # plt.figure(figsize=(12,8))
    # ax = plt.axes()
    # out_sel1.rf.plot(ax = ax)
    # countries.plot(ax = ax, alpha = 0.8, facecolor = 'none')

    out_sel1["time_bnds"] = ds["time_bnds"]
    dataset_output = dataset.replace(".nc", "_Italy.nc")
    out_sel1.to_netcdf(dataset_output)
