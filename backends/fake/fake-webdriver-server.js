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


let baseModule;
try {
  // To support easy development when making changes in the source repo, we
  // first try looking for a copy of the base module using a relative path.  In
  // this context, we prefer the local copy over one that may already be
  // installed.
  baseModule = require('../../generic-webdriver-server');
} catch (error) {
  if (!error.message.includes('Cannot find module')) {
    throw error;
  }

  // When this module is running in an installed context, we fall back to
  // requiring the installed base module by name.
  baseModule = require('generic-webdriver-server');
}

const {GenericWebDriverServer, yargs} = baseModule;
const crypto = require('crypto');
const fs = require('fs');
const util = require('util');

const randomBytes = util.promisify(crypto.randomBytes);
const readFile = util.promisify(fs.readFile);

const NUM_RANDOM_ID_BYTES = 16;  // AKA 128 bits, the same as a UUID.

/** Fake WebDriver server backend */
class FakeWebDriverServer extends GenericWebDriverServer {
  /** @override */
  async ready() {
    // True when a new session can be created.

    // Here, we pretend we can always make a new session.
    return true;
  }

  /** @override */
  async shutdown() {
    // Shut down anything belonging to the backend and close all sessions.

    // Here, we do nothing.
  }

  /** @override */
  async createSession() {
    // Create a new session and return a unique session ID.  Return null if this
    // can't be done.

    // Here, we create a randomly-generated ID in hex.
    const bytes = await randomBytes(NUM_RANDOM_ID_BYTES);
    return bytes.toString('hex');
  }

  /** @override */
  async navigateTo(sessionId, url) {
    // Navigate the given session to the given URL.

    // Here, we pretend we did it.
  }

  /** @override */
  async screenshot(sessionId) {
    // Take a full-page screenshot of the given session.
    // If screenshots are not supported, leave this unimplemented in the
    // subclass.

    // Here, we return a canned PNG.
    return readFile(__dirname + '/fake-screenshot.png');
  }

  /** @override */
  async getTitle(sessionId) {
    // Get the page title of the given session.  It doesn't have to be correct,
    // as this is often used as a ping or keep-alive.  Here we just make one up.

    // Use a command-line argument to show an example of how those can be
    // accessed.
    return 'Title of the page / ' + (this.flags.foo || '');
  }

  /** @override */
  async closeSession(sessionId) {
    // Shut down the given session.  Never throws, even on invalid session ID.

    // Here, pretend we did it.
  }
}

// Some dummy args to show how this works for other implementations.
// Any implementation-specific arguments can be added in a similar way.
// See documentation for the yargs module here:
// https://github.com/yargs/yargs#readme
yargs
    .option('foo', {
      description: 'any foo will do',
      type: 'string',
      // NOTE: Use demandOption: true to make something a required parameter
    })
    .option('bar', {
      description: 'specific bars are better than general ones',
      type: 'string',
      default: 'any old bar',
    });

const server = new FakeWebDriverServer();
server.listen();
