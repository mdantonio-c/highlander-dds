FROM rapydo/backend:1.1

COPY packages/*.whl /tmp/

RUN pip3 install /tmp/dds_backend-0.5b1-cp39-cp39-linux_x86_64.whl /tmp/intake_cmcc-0.5b1-cp39-cp39-linux_x86_64.whl

ENV CATALOG_DIR="/catalog"
