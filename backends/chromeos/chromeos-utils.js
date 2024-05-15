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


const fetch = require('node-fetch');
const fs = require('fs');
const {NodeSSH} = require('node-ssh');
const path = require('path');

// A URL where the default SSH private key for dev-mode ChromeOS can be found.
// The key is encoded in base64.
const DEFAULT_PRIVATE_KEY_URL = 'https://chromium.googlesource.com/chromiumos/overlays/chromiumos-overlay/+/main/chromeos-base/chromeos-ssh-testkeys/files/testing_rsa?format=TEXT';

// The default path where the ChromeOS private key will be read/stored.
const DEFAULT_PRIVATE_KEY_PATH =
    path.join(process.env.HOME, '.ssh', 'chromeos_testing_rsa');

// The default SSH port.
const DEFAULT_SSH_PORT = 22;

// The destination folder for the helper shell scripts we will transfer to the
// ChromeOS device.
const DESTINATION_FOLDER = 'chromeos-webdriver-scripts';

// The helper shell scripts we will transfer to the ChromeOS device.
const SCRIPTS = [
  'auto_login_chrome_wrapper.sh',
  'launch_page.sh',
  'show_login_screen.sh',
  'shut_down_sessions.sh',
];

/**
 * Fetch the private key for the ChromeOS device based on the flags.
 *
 * @param {!object<string, ?>} flags Parsed command-line flags.
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @return {!Promise}
 */
async function fetchPrivateKey(flags, log) {
  // Check if the private key is present.
  if (!fs.existsSync(flags.privateKey)) {
    if (flags.fetchPrivateKey) {
      // Download the private key from the web.  ChromeOS in dev mode uses a
      // static key unless otherwise configured, so this works for most folks.
      log.info('Fetching ChromeOS private key.');
      log.debug(`Fetching key from ${flags.privateKeyUrl}`);

      const response = await fetch(flags.privateKeyUrl);
      // The URL gives us the key in base64, but we can have the fs module
      // decode it for us in writeFileSync.
      const privateKeyBase64 = await response.text();

      // If the folder doesn't exist, try to create it.
      const privateKeyFolder = path.dirname(flags.privateKey);
      if (!fs.existsSync(privateKeyFolder)) {
        fs.mkdirSync(privateKeyFolder, {recursive: true});
      }

      // Write the file and set the permissions.
      fs.writeFileSync(flags.privateKey, privateKeyBase64, 'base64');
      fs.chmodSync(flags.privateKey, 0o600);
    } else {
      log.error(`Private key not found at ${flags.privateKey} and ` +
                `fetching disabled. See --fetch-private-key and ` +
                `--private-key-url for details.`);
      throw new Error(`Private key not found at ${flags.privateKey}`);
    }
  }
}

/**
 * Use SSH to connect to a dev-mode-enabled ChromeOS device and transfer
 * necessary scripts.
 *
 * Use fetchPrivateKey first.
 *
 * @param {!object<string, ?>} flags Parsed command-line flags.
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @return {!Promise<!NodeSSH>} An open SSH connection from the node-ssh module.
 */
async function connectAndPrepDevice(flags, log) {
  // Hostname is in one of the following forms:
  //   "hostname-or-ip"
  //   "hostname-or-ip:port"
  const host = flags.hostname.split(':')[0];
  const port = parseInt(flags.hostname.split(':')[1], 10) || DEFAULT_SSH_PORT;

  log.info(`Connecting to ChromeOS device ${flags.hostname}`);
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host,
      port,
      username: flags.username,
      privateKeyPath: flags.privateKey,
    });

    log.debug(`Creating scripts folder ${DESTINATION_FOLDER}`);
    await executeRemoteCommand(log, ssh, ['mkdir', '-p', DESTINATION_FOLDER]);

    log.debug(`Transfering scripts.`);
    const destinations = [];
    const transfers = [];

    for (const scriptName of SCRIPTS) {
      const src = path.resolve(__dirname, 'scripts', scriptName);
      const dest = `${DESTINATION_FOLDER}/${scriptName}`;

      destinations.push(dest);
      transfers.push({local: src, remote: dest});
    }

    await ssh.putFiles(transfers);

    log.debug('Making scripts executable.');
    await executeRemoteCommand(log, ssh,
        ['/bin/chmod', '755'].concat(destinations));
  } catch (error) {
    // If there was an error in the steps above, dispose of the SSH connection
    // and rethrow the error.  Otherwise, we keep the connection alive and
    // return it.
    ssh.dispose();
    throw error;
  }

  return ssh;
}


/**
 * Uses an SSH connection to a dev-mode-enabled ChromeOS device to launch Chrome
 * with a specific URL and command-line arguments.
 *
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @param {!NodeSSH} ssh An open SSH connection from the node-ssh module.
 * @param {?string} url If non-null, launch Chrome to view the specified URL.
 *   This will launch Chrome in kiosk mode to avoid showing any existing tabs
 *   from the previous session.
 * @param {?Array<string>} chromeArgs If non-null, pass these extra command-line
 *   arguments to Chrome.
 * @return {!Promise}
 */
async function loadOnChromeOS(log, ssh, url, chromeArgs) {
  // Create the necessary launch command.
  const launchCommand = [
    `${DESTINATION_FOLDER}/launch_page.sh`,
  ];
  if (chromeArgs) {
    launchCommand.push(...chromeArgs);
  }
  if (url) {
    log.info(`Directing to ${url}`);
    // --kiosk is needed to avoid showing any existing tabs from a previous
    // session.
    launchCommand.push('--kiosk');
    // Recent ChromeOS versions must specify the kiosk-mode URL with --app=...
    launchCommand.push('--app=' + url);
  } else {
    log.info(`Opening previous session.`);
  }

  await executeRemoteCommand(log, ssh, launchCommand);
}

/**
 * Uses an SSH connection to a dev-mode-enabled ChromeOS device to shut down any
 * existing session and show the login screen.
 *
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @param {!NodeSSH} ssh An open SSH connection from the node-ssh module.
 */
async function loadChromeOSLoginScreen(log, ssh) {
  await executeRemoteCommand(log, ssh, [
    `${DESTINATION_FOLDER}/show_login_screen.sh`,
  ]);
}

/**
 * Execute a remote command on the ChromeOS device.
 *
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @param {!NodeSSH} ssh An open SSH connection from the node-ssh module.
 * @param {!Array<string>} argv The command line to execute
 * @return {!Promise<NodeSSH.Output>} The full output object from ssh.exec() if
 *   sucessful.  Rejected with an Error on failure.
 */
async function executeRemoteCommand(log, ssh, argv) {
  log.debug(`Executing remote command: ${argv.join(' ')}`);

  const executable = argv[0];
  const args = argv.slice(1);
  const options = {
    // Get both stdout and stderr.
    stream: 'both',
  };

  const output = await ssh.exec(executable, args, options);

  // output.code == 0 means success.
  if (output.code != 0) {
    log.error(`Remote command ${argv.join(' ')} ` +
              `failed with exit code ${output.code} ` +
              `and full output: ${output.stdout} ${output.stderr}`);
    throw new Error(`Remote command failed with exit code ${output.code}`);
  }

  return output;
}

/**
 * Add ChromeOS-specific arguments to the application's argument parser (from
 * the "yargs" module).
 *
 * @param {Yargs} yargs The argument parser object from "yargs".
 */
function addChromeOSArgs(yargs) {
  yargs
      .option('hostname', {
        description:
            `The ChromeOS device hostname or IP address, with optional port ` +
            `number for SSH (default port number is ${DEFAULT_SSH_PORT})`,
        type: 'string',
        demandOption: true,
      })
      .option('username', {
        description:
            'The username to log in to the ChromeOS device over SSH.',
        type: 'string',
        default: 'root',
      })
      .option('private-key', {
        description:
            'The path to the SSH private key to authenticate to the ChromeOS ' +
            'device.',
        type: 'string',
        default: DEFAULT_PRIVATE_KEY_PATH,
      })
      .option('fetch-private-key', {
        description:
            'If true, we will fetch the private key and store it in the path ' +
            'specified by --private-key.',
        type: 'boolean',
        default: true,
      })
      .option('private-key-url', {
        description:
            'The URL from with to fetch the private key in base64 encoding.\n' +
            'Defaults to the standard private key installed in all dev-mode ' +
            'ChromeOS devices.',
        type: 'string',
        default: DEFAULT_PRIVATE_KEY_URL,
      });
}

module.exports = {
  fetchPrivateKey,
  connectAndPrepDevice,
  loadOnChromeOS,
  loadChromeOSLoginScreen,
  addChromeOSArgs,
};
