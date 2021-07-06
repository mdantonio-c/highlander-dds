ARG GEOSERVER_VER="2.18.2"
FROM geonode/geoserver:$GEOSERVER_VER
ARG GEOSERVER_VER

# Install GEOSERVER-NETCDF extension
# NOTE check lib webapps/geoserver/WEB-INF/lib in cp command when upgrading to 2.19.x
RUN mkdir /tmp/geoserver-netcdf && \
    wget -L --quiet --no-check-certificate -O /tmp/geoserver-netcdf/geoserver-$GEOSERVER_VER-netcdf-out-plugin.zip \
        https://sourceforge.net/projects/geoserver/files/GeoServer/$GEOSERVER_VER/extensions/geoserver-$GEOSERVER_VER-netcdf-out-plugin.zip/download && \
    unzip -d /tmp/geoserver-netcdf /tmp/geoserver-netcdf/geoserver-$GEOSERVER_VER-netcdf-out-plugin.zip && \
    cp /tmp/geoserver-netcdf/*.jar $CATALINA_HOME/webapps/geoserver/WEB-INF/lib && \
    rm -rf /tmp/geoserver-netcdf
