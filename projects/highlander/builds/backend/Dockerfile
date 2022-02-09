FROM rapydo/backend:2.2

COPY packages/*.whl /tmp/

RUN pip3 install --no-cache-dir /tmp/dds_backend-0.5b3-py3-none-any.whl /tmp/intake_cmcc-0.5b1-py3-none-any.whl

ENV CATALOG_DIR="/catalog"
