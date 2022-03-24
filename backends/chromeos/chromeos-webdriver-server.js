#!/usr/bin/env node
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {
  GenericSingleSessionWebDriverServer,
  yargs,
} = require('generic-webdriver-server');

const {
  fetchPrivateKey,
  connectAndPrepDevice,
  loadOnChromeOS,
  loadChromeOSLoginScreen,
  addChromeOSArgs,
} = require('./chromeos-utils');

/** WebDriver server backend for ChromeOS */
class ChromeOSWebDriverServer extends GenericSingleSessionWebDriverServer {
  constructor() {
    super();

    /** @private {NodeSSH} */
    this.ssh_ = null;
  }

  /** @override */
  async createSession() {
    const sessionId = await super.createSession();

    await fetchPrivateKey(this.flags, this.log);
    this.ssh_ = await connectAndPrepDevice(this.flags, this.log);

    return sessionId;
  }

  /** @override */
  async navigateToSingleSession(url) {
    // This is everything on the command line after "--".  These become extra
    // arguments to Chrome itself on the ChromeOS device.
    const extraArguments = this.flags._;

    await loadOnChromeOS(this.log, this.ssh_, url, extraArguments);
  }

  /** @override */
  async closeSingleSession() {
    // Send the device back to the login screen.
    await loadChromeOSLoginScreen(this.log, this.ssh_);

    this.ssh_.dispose();
    this.ssh_ = null;
  }
}

addChromeOSArgs(yargs);

const server = new ChromeOSWebDriverServer();
server.listen();
