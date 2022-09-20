FROM rapydo/backend-legacy39:2.3

USER root

ARG CURRENT_UID
RUN test -n "$CURRENT_UID"

ARG CURRENT_GID
RUN test -n "$CURRENT_GID"

RUN usermod -u ${CURRENT_UID} developer \
    && groupmod -og ${CURRENT_GID} developer

COPY packages/*.whl /tmp/

RUN pip3 install --upgrade pandas==1.4.4 \
    && pip3 install --no-cache-dir /tmp/dds_backend-0.5b3-py3-none-any.whl /tmp/intake_cmcc-0.5b1-py3-none-any.whl

ENV CATALOG_DIR="/catalog"

#########################################################
# CARTOPY
#########################################################
RUN apt-get update -qq \
    && apt-get dist-upgrade -y -qq \
    #  Install GEOS \
    && apt-get install -y libgeos-dev \
    # Install proj dependencies \
    && apt install -y cmake sqlite3 curl \
    && apt-get install -y libsqlite3-dev libtiff5-dev libcurl4-openssl-dev libproj-dev \
    # As cartopy requires proj v8.0.0 as a minimum, but if you install proj using apt you can only install proj v6.3.1 \
    # build Proj from source
    && wget https://download.osgeo.org/proj/proj-9.0.0.tar.gz \
    && tar -xf proj-9.0.0.tar.gz \
    && cd proj-9.0.0 \
    && mkdir build && cd build \
    && cmake .. && cmake --build . && cmake --build . --target install \
    && cp ./bin/* /bin \
    # finally install cartopy
    && pip3 install --upgrade --no-cache-dir Cartopy \
    && apt-get autoremove -y && apt-get clean

# prepare the cartopy data dir
ENV CARTOPY_DATA_DIR "/cartopy"
RUN mkdir ${CARTOPY_DATA_DIR}
# physical data
ENV NE_PHYSICAL "${CARTOPY_DATA_DIR}/shapefiles/natural_earth/physical"
RUN mkdir -p ${NE_PHYSICAL}

RUN curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_ocean.zip"  -o "${CARTOPY_DATA_DIR}/ne_10m_ocean.zip" \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_coastline.zip"  -o "${CARTOPY_DATA_DIR}/ne_10m_coastline.zip" \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_lakes.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_lakes.zip"  \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_rivers_lake_centerlines.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_rivers_lake_centerlines.zip"  \
    && curl "https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_land.zip" \
    && curl "https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_land.zip" -o "${CARTOPY_DATA_DIR}/ne_110m_land.zip" \
    && curl "https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_ocean.zip" -o "${CARTOPY_DATA_DIR}/ne_110m_ocean.zip" \
    && curl "https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_coastline.zip" -o "${CARTOPY_DATA_DIR}/ne_110m_coastline.zip" \
    && curl "https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_lakes.zip" -o "${CARTOPY_DATA_DIR}/ne_110m_lakes.zip" \
    && curl "https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_rivers_lake_centerlines.zip" -o "${CARTOPY_DATA_DIR}/ne_110m_rivers_lake_centerlines.zip"
RUN apt-get -yq install unzip
RUN unzip ${CARTOPY_DATA_DIR}/\*.zip -d "${NE_PHYSICAL}"
RUN rm ${CARTOPY_DATA_DIR}/*.zip

# cultural data
ENV NE_CULTURAL "${CARTOPY_DATA_DIR}/shapefiles/natural_earth/cultural"
RUN mkdir -p ${NE_CULTURAL}
RUN curl "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_boundary_lines_land.zip" -o "${CARTOPY_DATA_DIR}/ne_10m_admin_0_boundary_lines_land.zip" \
    && curl "https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_boundary_lines_land.zip" -o "${CARTOPY_DATA_DIR}/ne_110m_admin_0_boundary_lines_land.zip"
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
    && pip3 install --upgrade numpy==1.22.4
