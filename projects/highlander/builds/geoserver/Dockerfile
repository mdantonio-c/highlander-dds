ARG GEOSERVER_VER="2.19.x"
FROM geonode/geoserver:$GEOSERVER_VER
ARG GEOSERVER_VER="2.19.2"
#ARG GEOSERVER_VER="2.18.2"
#FROM geonode/geoserver:$GEOSERVER_VER
#ARG GEOSERVER_VER

ARG CURRENT_UID
RUN test -n "$CURRENT_UID"

ARG CURRENT_GID
RUN test -n "$CURRENT_GID"

# Install GEOSERVER-NETCDF extension
# NOTE check lib webapps/geoserver/WEB-INF/lib in cp command when upgrading to 2.19.x
RUN mkdir /tmp/geoserver-netcdf && \
    wget -L --quiet --no-check-certificate -O /tmp/geoserver-netcdf/geoserver-$GEOSERVER_VER-netcdf-out-plugin.zip \
        https://sourceforge.net/projects/geoserver/files/GeoServer/$GEOSERVER_VER/extensions/geoserver-$GEOSERVER_VER-netcdf-out-plugin.zip/download && \
    unzip -d /tmp/geoserver-netcdf /tmp/geoserver-netcdf/geoserver-$GEOSERVER_VER-netcdf-out-plugin.zip && \
    cp /tmp/geoserver-netcdf/*.jar $CATALINA_HOME/webapps/geoserver/WEB-INF/lib && \
    rm -rf /tmp/geoserver-netcdf && \
    apt-get update -qq && \
    apt-get install --yes --no-install-recommends libnetcdf-dev vim && \
    apt-get autoremove --yes && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV TOMCAT_USER tomcat

RUN useradd \
    -r -M -d /home/$TOMCAT_USER -s /bin/bash -p ! \
    --uid $CURRENT_UID $TOMCAT_USER \
    && groupmod -og $CURRENT_GID $TOMCAT_USER \
    && mkdir -p /home/$TOMCAT_USER \
    && chown $CURRENT_UID:$CURRENT_GID /home/$TOMCAT_USER

# Prevent RCE exploit in log4j CVE-2021-44228
ENV JAVA_OPTS="${JAVA_OPTS} -Dlog4j2.formatMsgNoLookups=true"

# Force tomcat to run as NO-root user
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN chown -R $(id tomcat -u) /usr/local/tomcat && \
    sed -i  "$(grep -n 'catalina.sh run' /usr/local/tomcat/tmp/entrypoint.sh | cut -f1 -d:)d" /usr/local/tomcat/tmp/entrypoint.sh && \
    sed -i '$aexec env JAVA_OPTS="${JAVA_OPTS}" su -c "PATH=$PATH catalina.sh run" tomcat' /usr/local/tomcat/tmp/entrypoint.sh
