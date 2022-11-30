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


const yargs = require('yargs');
const {Mode, cast, addChromecastArgs} = require('./cast-utils');

yargs
    .strict()
    .usage('Usage: $0 --hostname=<HOSTNAME> --url=<URL>')
    .usage('-or-:  $0 --hostname=<HOSTNAME> --home')
    .usage('-or-:  $0 --hostname=<HOSTNAME> --show-serial')
    .option('url', {
      description:
          'A URL to direct the Chromecast to.\n' +
          'Either --url, --home, or --show-serial must be specified.',
      type: 'string',
    })
    .option('home', {
      description:
          'Direct the Chromecast to the home screen.\n' +
          'Either --url, --home, or --show-serial must be specified.',
      type: 'boolean',
    })
    .option('show-serial', {
      description:
          'Show the serial number of the Chromecast on the screen\n' +
          'and speak it aloud (useful for audio-only devices).\n' +
          'Either --url, --home, or --show-serial must be specified.',
      type: 'boolean',
    })
    // You can't use more than one of these at once.
    .conflicts('url', 'home')
    .conflicts('home', 'show-serial')
    .conflicts('url', 'show-serial')
    .check((flags) => {
      // Enforce that one mode is required.
      if (!flags.url && !flags.home && !flags.showSerial) {
        throw new Error(
            'Either --url, --home, or --show-serial must be specified.');
      }

      return true;
    });

addChromecastArgs(yargs);

const flags = yargs.argv;

let mode = Mode.HOME;
if (flags.url) {
  mode = Mode.URL;
} else if (flags.showSerial) {
  mode = Mode.SERIAL_NUMBER;
}

cast(flags, /* log= */ console, mode, flags.url);
