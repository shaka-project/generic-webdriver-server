#!/bin/bash

# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Generates a new certificate for code-signing.  Shouldn't need to be done
# often, since this one will be valid for 100 years, but at least the process
# is repeatable and documented.


# Go to the working directory.
cd $(dirname "$0")

# Create temp files, and clean them up on exit.
tmp_key=$(mktemp -t generic-webdriver-server.xboxone.XXXXXX --suffix=.key)
tmp_crt=$(mktemp -t generic-webdriver-server.xboxone.XXXXXX --suffix=.crt)
trap 'rm -f -- "$tmp_key" "$tmp_crt"' INT TERM HUP EXIT

# Show commands and exit on failure.
set -x
set -e

# Generate a key and a self-signed cert with the right properties.
# Visual studio is very picky about the key usage extensions.
openssl req \
  -x509 \
  -newkey rsa:4096 \
  -sha256 \
  -days 36500 \
  -nodes \
  -keyout $tmp_key \
  -out $tmp_crt \
  -subj "/CN=generic-webdriver-server/" \
  -extensions usr_cert \
  -addext "keyUsage = digitalSignature" \
  -addext "extendedKeyUsage = codeSigning"

# Show the contents of the cert, for debugging purposes.
openssl x509 -noout -text -in $tmp_crt

# Export the cert and key in the format Visual Studio wants.
openssl pkcs12 \
  -export \
  -keypbe NONE \
  -certpbe NONE \
  -nomaciter \
  -passout pass: \
  -in $tmp_crt \
  -inkey $tmp_key \
  -out PackageCertificateKeyFile.pfx
