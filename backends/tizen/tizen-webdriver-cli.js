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
const {loadOnTizen, addTizenArgs} = require('./tizen-utils');

yargs
    .strict()
    .usage('Usage: $0 --hostname=<HOSTNAME> --url=<URL>')
    .usage('   or: $0 --hostname=<HOSTNAME> --home')
    .option('url', {
      description: 'A URL to direct the Tizen device to.\n' +
                   'Either --url or --home must be specified.',
      type: 'string',
    })
    .option('home', {
      description: 'Direct the Tizen device to the home screen.\n' +
                   'Either --url or --home must be specified.',
      type: 'boolean',
    })
    // You can't use both at once.
    .conflicts('url', 'home')
    .check((flags) => {
      // Enforce that one or the other is specified.
      if (!flags.url && !flags.home) {
        throw new Error('Either --url or --home must be specified.');
      }

      return true;
    });

addTizenArgs(yargs);

const flags = yargs.argv;

loadOnTizen(flags, /* log= */ console, flags.url);
