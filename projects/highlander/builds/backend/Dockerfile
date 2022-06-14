FROM rapydo/backend:2.2

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
    && pip3 install --upgrade --no-cache-dir Cartopy==0.19.0.post1  \
    && apt-get autoremove --yes && apt-get clean

#########################################################
# REGIONMASK SEABORN and MPL_TOOLKITS
#########################################################
RUN pip3 install --upgrade --no-cache-dir regionmask \
    && pip3 install --upgrade --no-cache-dir seaborn \
    && pip3 install --upgrade --no-cache-dir matplotlib
