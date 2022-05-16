FROM rapydo/backend:2.3

COPY packages/*.whl /tmp/

RUN pip3 install --no-cache-dir /tmp/dds_backend-0.5b3-py3-none-any.whl /tmp/intake_cmcc-0.5b1-py3-none-any.whl

ENV CATALOG_DIR="/catalog"

#########################################################
# CARTOPY
#########################################################
RUN apt-get upgrade  \
    && apt-get update \
    && apt-get install -y libproj-dev proj-data proj-bin \
    && apt-get install -y libgeos-dev \
    && pip3 install cython \
    && pip3 install cartopy==0.19.0.post1 # the latest version has problems with PROJ version

#########################################################
# REGIONMASK SEABORN and MPL_TOOLKITS
#########################################################
RUN pip3 install regionmask && pip3 install seaborn && pip3 install matplotlib
