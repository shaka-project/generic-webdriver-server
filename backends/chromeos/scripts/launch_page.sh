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

# Launches Chrome on ChromeOS using auto_login_chrome_wrapper to bypass the
# login screen.  This will be copied to the ChromeOS device to run tests.

THIS_DIR=$(realpath $(dirname "$0"))

# Stop any existing sessions.
"$THIS_DIR/shut_down_sessions.sh"

# All arguments to this script will become arguments to Chrome.
# But session_manager doesn't have a way for us to pass arguments containing
# spaces.  So we put arguments into a temp file instead of passing them through
# the session_manager command-line.
echo "* Launching a new session manager with args: $@"
EXTRA_ARGS_FILE="$THIS_DIR/extra-args.txt"
> "$EXTRA_ARGS_FILE"
for ARGUMENT in "$@"; do
  echo "$ARGUMENT" >> "$EXTRA_ARGS_FILE"
done

# Run a new session manager that will login in directly through our wrapper and
# launch the URL given on the command line.
WRAPPER_PATH="$THIS_DIR/auto_login_chrome_wrapper.sh"
# NOTE: All arguments to the wrapper get put into a single argument to the
# session manager.
WRAPPER_ARG="--chrome-command=$WRAPPER_PATH --extra-args=$EXTRA_ARGS_FILE"

# Start session manager in the background.
nohup /sbin/session_manager "$WRAPPER_ARG" </dev/null &>/dev/null &

# If it's still running after 5 seconds, assume it's going to keep running.
for ((i = 0; i < 5; ++i)); do
  if ! pidof session_manager &>/dev/null; then
    # pidof failed, meaning session_manager is no longer running.
    # Complain and fail the script.
    echo "* Failed to launch session manager!"
    exit 1
  fi
  sleep 1
done

echo "* Launched!"
