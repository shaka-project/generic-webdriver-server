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


const fs = require('fs');
const yargs = require('yargs');
const {loadOnXboxOne, takeScreenshot, addXboxOneArgs} =
    require('./xbox-one-utils');

yargs
    .strict()
    .usage('Usage: $0 --hostname=<HOSTNAME> --url=<URL>')
    .usage('   or: $0 --hostname=<HOSTNAME> --home')
    .usage('   or: $0 --hostname=<HOSTNAME> --screenshot=<OUTPUT.PNG>')
    .option('url', {
      description: 'A URL to direct the Xbox One device to.\n' +
                   'Either --url, --home, or --screenshot must be specified.',
      type: 'string',
    })
    .option('home', {
      description: 'Direct the Xbox One device to the home screen.\n' +
                   'Either --url, --home, or --screenshot must be specified.',
      type: 'boolean',
    })
    .option('screenshot', {
      description: 'Take a screenshot of the Xbox One device and save to the ' +
                   'specified path.\n' +
                   'Either --url, --home, or --screenshot must be specified.',
      type: 'string',
    })
    // You can't use more than one of these at once.
    .conflicts('url', 'home')
    .conflicts('url', 'screenshot')
    .conflicts('home', 'screenshot')
    .check((flags) => {
      // Enforce that one or the other is specified.
      if (!flags.url && !flags.home && !flags.screenshot) {
        throw new Error(
            'Either --url, --home, or --screenshot must be specified.');
      }

      return true;
    });

addXboxOneArgs(yargs);

const flags = yargs.argv;

(async () => {
  try {
    if (flags.screenshot) {
      const data = await takeScreenshot(
          flags.hostname, flags.username, flags.password);
      fs.writeFileSync(flags.screenshot, data);
    } else {
      await loadOnXboxOne(flags, /* log= */ console, flags.url);
    }
  } catch (error) {
    console.error(error);
  }
})();
