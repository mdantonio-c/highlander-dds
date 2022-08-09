FROM rapydo/backend:2.3

COPY packages/*.whl /tmp/

RUN pip3 install --no-cache-dir /tmp/dds_backend-0.5b3-py3-none-any.whl /tmp/intake_cmcc-0.5b1-py3-none-any.whl

ENV CATALOG_DIR="/catalog"

#########################################################
# CARTOPY
#########################################################
RUN apt-get update -qq \
    && apt-get dist-upgrade --yes -qq \
    && apt-get install --yes libproj-dev proj-data proj-bin libgeos-dev \
    && pip3 install --upgrade --no-cache-dir Cython \
    # the latest version has problems with PROJ version
    && pip3 install --upgrade --no-cache-dir Cartopy \
    && apt-get autoremove --yes && apt-get clean

# prepare the cartopy data dir
ENV CARTOPY_DATA_DIR "/cartopy"
RUN mkdir ${CARTOPY_DATA_DIR}
#physical data
ENV NE_PHYSICAL "${CARTOPY_DATA_DIR}/shapefiles/natural_earth/physical"
RUN mkdir -p ${NE_PHYSICAL}

RUN curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_ocean.zip"  -o "${CARTOPY_DATA_DIR}/ne_10m_ocean.zip" \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_coastline.zip"  -o "${CARTOPY_DATA_DIR}/ne_10m_coastline.zip" \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_lakes.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_lakes.zip"  \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_rivers_lake_centerlines.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_rivers_lake_centerlines.zip"  \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_land.zip"
RUN apt-get -yq install unzip
RUN unzip ${CARTOPY_DATA_DIR}/\*.zip -d "${NE_PHYSICAL}"
RUN rm ${CARTOPY_DATA_DIR}/*.zip

# cultural data
ENV NE_CULTURAL "${CARTOPY_DATA_DIR}/shapefiles/natural_earth/cultural"
RUN mkdir -p ${NE_CULTURAL}
RUN curl "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_boundary_lines_land.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_admin_0_boundary_lines_land.zip"
RUN unzip ${CARTOPY_DATA_DIR}/\*.zip -d "${NE_CULTURAL}"
RUN rm ${CARTOPY_DATA_DIR}/*.zip

# change the ownership
RUN chown "developer:developer" -R ${CARTOPY_DATA_DIR}

#########################################################
# REGIONMASK SEABORN and MPL_TOOLKITS
#########################################################
RUN pip3 install --upgrade --no-cache-dir regionmask \
    && pip3 install --upgrade --no-cache-dir seaborn \
    && pip3 install --upgrade --no-cache-dir matplotlib \
    && pip3 install --upgrade numpy==1.22.4 \
    && pip3 install --upgrade shapely==1.8.2
