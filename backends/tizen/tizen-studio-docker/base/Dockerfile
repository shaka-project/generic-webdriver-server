# Docker instructions to build a Tizen Studio image.
# This can simplify usage of the Tizen WebDriver Server, since Tizen Studio can
# be painful to install and configure.

# Tizen Studio, as of v3.7, will not install on newer Ubuntu versions.
FROM ubuntu:18.04

MAINTAINER joeyparrish <joeyparrish@google.com>

# Update the list of packages available and install Tizen Studio dependencies.
# Then clear the apt cache to reduce the size of the final image.
# Docker's best practices guide recommends that these all be combined into one
# step to avoid issues with the caching system.
RUN apt-get -y update \
&& apt-get -y install --no-install-recommends \
  ca-certificates \
  cpio \
  gettext \
  libssl1.0.0 \
  libwebkitgtk-1.0-0 \
  locales \
  openjdk-8-jre-headless \
  rpm2cpio \
  software-properties-common \
  sudo \
  unzip \
  wget \
  zip \
&& apt-get -y clean \
&& rm -rf /var/lib/apt/lists/* \
&& rm -rf /etc/apt/sources.list.d/*

# Add a non-root user with sudo access.
RUN groupadd -r tizen \
&& useradd --no-log-init -m -s /bin/bash -g tizen -G sudo tizen
# This will allow password-less usage of sudo for this user.  The commands
# below to install the TV extensions for the SDK will internally invoke sudo,
# and a password prompt will fail because it is run without a terminal.
RUN echo "tizen ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Switch to the non-root user to run the installer.
USER tizen
WORKDIR /home/tizen

# Download the Tizen Studio installer.
ARG TIZEN_STUDIO_VERSION=3.7
ARG TIZEN_STUDIO_DL_FOLDER=http://download.tizen.org/sdk/Installer/tizen-studio_${TIZEN_STUDIO_VERSION}
ARG TIZEN_STUDIO_BINARY=web-cli_Tizen_Studio_${TIZEN_STUDIO_VERSION}_ubuntu-64.bin
RUN wget ${TIZEN_STUDIO_DL_FOLDER}/${TIZEN_STUDIO_BINARY} \
  -O ${TIZEN_STUDIO_BINARY} && \
  chown ${UID}:${GID} ${TIZEN_STUDIO_BINARY} && \
  chmod +x ${TIZEN_STUDIO_BINARY}

# Install Tizen Studio.
RUN echo "y" | ./${TIZEN_STUDIO_BINARY} --accept-license --no-java-check
RUN rm ${TIZEN_STUDIO_BINARY}

# Update the default extensions.
RUN ./tizen-studio/package-manager/package-manager-cli.bin --no-java-check update

# Create an author certificate.
RUN ./tizen-studio/tools/ide/bin/tizen certificate \
  -a author -p author
RUN ./tizen-studio/tools/ide/bin/tizen security-profiles \
  add -n author -p author -a $(pwd)/tizen-studio-data/keystore/author/author.p12

# The certificate manager won't properly store the passwords, so edit the
# profiles XML file and replace password paths with the literal passwords.
RUN sed -i tizen-studio-data/profile/profiles.xml \
  -e "s@password=\".*tizen-distributor-signer.pwd\"@password=\"tizenpkcs12passfordsigner\"@" \
  -e "s@password=\".*author.pwd\"@password=\"author\"@"

ENV PATH $PATH:/home/tizen/tizen-studio/tools/ide/bin:/home/tizen/tizen-studio/tools
CMD ["/bin/bash"]
