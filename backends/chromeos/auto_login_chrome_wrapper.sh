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

# A wrapper which is invoked in place of Chrome to bypass the login screen on
# ChromeOS.  This will be copied to the ChromeOS device to run tests.

# Fail on the first error encountered.
set -e

CHROME_PATH="/opt/google/chrome/chrome"

# This is a JSON file with ChromeOS state.
# As far as we know, the format of this file is undocumented.
LOCAL_STATE_PATH="/home/chronos/Local State"

# This is in jq's query syntax to get the login user from the state file above.
LAST_USER_QUERY=".LastLoggedInRegularUser"

# Find the most recent user logged in, and use that.
if [ -z "$LAST_USER" ]; then
  # The string value comes in quotes, so strip those out with -r.
  LAST_USER=$(jq -r "$LAST_USER_QUERY" "$LOCAL_STATE_PATH")
fi

# Copy inbound command line args to a local array.
ARGS=()
for INPUT_ARG in "$@"; do
  if [[ "$INPUT_ARG" == "--login-manager" ]]; then
    # Ignore the --login-manager argument, which is forced on us by
    # session_manager and forces the login screen to show up.
    true
  elif [[ "$INPUT_ARG" == "--extra-args="* ]]; then
    # Extract the --extra-args= argument, which was invented by us to pass
    # extra Chrome arguments via the filesystem.  Because session_manager
    # doesn't have a way to escape spaces in its --chrome-command argument,
    # this file full of arguments lets us bypass session_manager.
    ARG_FILE=$(echo "$INPUT_ARG" | cut -f 2- -d =)
    # Now read the file line by line and append those lines to the argument
    # array.
    while IFS= read -r EXTRA_ARG; do
      ARGS+=( "$EXTRA_ARG" )
    done < "$ARG_FILE"
  else
    ARGS+=( "$INPUT_ARG" )
  fi
done

# Append --login-user argument to skip the login screen.
ARGS+=( "--login-user=$LAST_USER" )

# Execute Chrome, replacing this script with Chrome itself.
exec "$CHROME_PATH" "${ARGS[@]}"
