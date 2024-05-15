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

# Shuts down any existing sessions on ChromeOS.  This will be copied to the
# ChromeOS device and used before and after a test session.

# Stop any existing session.
echo "* Shutting down any session manager started at boot"
stop ui &>/dev/null

# We do not have killall on ChromeOS, so we kill each PID individually.
SESSION_MANAGER_PIDS="$(pidof session_manager)"
if [[ "$SESSION_MANAGER_PIDS" != "" ]]; then
  echo "* Killing session managers"
  kill $SESSION_MANAGER_PIDS
fi

# Wait for everything to shut down.
# Without this, we sometimes get this error:
# "Unable to take ownership of org.chromium.SessionManager"
echo "* Waiting for all session managers to stop"
# This loop has an effective timeout of 5 seconds.
for ((i = 0; i < 50; ++i)); do
  if ! pidof session_manager &>/dev/null; then
    # pidof failed, meaning session_manager is no longer running.
    break
  fi
  sleep 0.1
done
