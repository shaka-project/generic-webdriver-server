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
const {
  fetchPrivateKey,
  connectAndPrepDevice,
  loadOnChromeOS,
  loadChromeOSLoginScreen,
  addChromeOSArgs,
} = require('./chromeos-utils');

yargs
    .strict()
    .usage('Usage: $0 --hostname=<HOSTNAME> --url=<URL> -- [<CHROME_ARGS>]')
    .usage('   or: $0 --hostname=<HOSTNAME> --login-screen')
    .option('url', {
      description: 'A URL to direct the ChromeOS device to.\n' +
                   'Either --url or --login-screen must be specified.',
      type: 'string',
    })
    .option('login-screen', {
      description: 'Load the login screen on the ChromeOS device.\n' +
                   'Either --url or --login-screen must be specified.',
      type: 'boolean',
    })
    // You can't use both at once.
    .conflicts('url', 'login-screen')
    .check((flags) => {
      // Enforce that one or the other is specified.
      if (!flags.url && !flags.loginScreen) {
        throw new Error('Either --url or --login-screen must be specified.');
      }

      return true;
    });

addChromeOSArgs(yargs);

const flags = yargs.argv;

// This is everything on the command line after "--".  These become extra
// arguments to Chrome itself on the ChromeOS device.
const extraArguments = flags._;

(async () => {
  await fetchPrivateKey(flags, /* log= */ console);
  const ssh = await connectAndPrepDevice(flags, /* log= */ console);
  if (flags.loginScreen) {
    await loadChromeOSLoginScreen(/* log= */ console, ssh);
  } else {
    await loadOnChromeOS(/* log= */ console, ssh, flags.url,
        /* chromeArgs= */ extraArguments);
  }
  ssh.dispose();
})();
