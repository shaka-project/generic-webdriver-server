# Docker instructions to build a Tizen Studio image with Tizen TV-3.0
# extensions.
#
# This can simplify usage of the Tizen WebDriver Server, since Tizen Studio can
# be painful to install and configure.

# Build on top of the generic tizen-studio package.
FROM gcr.io/generic-webdriver-server/tizen-studio

MAINTAINER joeyparrish <joeyparrish@google.com>

USER tizen
WORKDIR /home/tizen

# Add the repo for the TV-3.0 extensions.
ARG TV_3_REPO_URL=http://sdf.samsungcloudcdn.com/Public/smart_tv_sdk/releases/samsung_tizen_studio_tv_sdk/stv_ext_public/3.0
RUN ./tizen-studio/package-manager/package-manager-cli.bin --no-java-check \
  extra --add -n 'TV-3.0' -r ${TV_3_REPO_URL}

# Install the TV-3.0 web app extensions.
RUN ./tizen-studio/package-manager/package-manager-cli.bin --no-java-check \
  --accept-license install \
  TV-3.0-samsung-public-WebAppDevelopment

