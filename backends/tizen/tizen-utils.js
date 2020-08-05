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
const path = require('path');
const tmp = require('tmp-promise');
const util = require('util');

const execFile = util.promisify(require('child_process').execFile);

const hostAppTemplatePath = path.resolve(__dirname, 'app-template');
const dockerImageAppTemplatePath = '/tmp/app-template';

/**
 * Uses Tizen Studio to connect to a Tizen device, install a temporary container
 * app, and load a URL into it.
 *
 * @param {!object<string, ?>} flags Parsed command-line flags.
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @param {?string} url If non-null, install the Tizen container app and load
 *   the URL into it.  If null, send the Tizen device back to the home screen.
 * @return {!Promise}
 */
async function loadOnTizen(flags, log, url) {
  /**
   * We build a set of commands which will be combined and executed in bash -c.
   * For locally-installed copies of Tizen Studio, these will be executed in
   * bash directly.  When using a Docker image (the default), these will be
   * executed inside Docker.
   *
   * @type {!Array<string>}
   */
  let commands = [];

  const appTemplatePath = flags.localTizenStudio ?
      // For a local copy of Tizen Studio, we are running on the host machine
      // and need an absolute path to the app template included with this
      // module.
      hostAppTemplatePath :
      // For a Tizen Studio Docker image, we will mount the app template into
      // the Docker image in the /tmp directory, so our commands below will use
      // that path.
      dockerImageAppTemplatePath;

  commands = commands.concat([
    // Connect to the Tizen device.
    `"${flags.tizenStudioPath}"/tools/sdb connect "${flags.hostname}"`,
    // Get the device name, in case there are multiple connected devices.
    // This will not happen with the Docker image, since it does not persist,
    // but could happen with local copies of Tizen Studio which may have
    // persistent connections to multiple devices.
    `DEVICE=$("${flags.tizenStudioPath}"/tools/sdb devices
                  | grep "${flags.hostname}" | cut -f 3)`,
    // Uninstall any pre-existing version of this container app, which has the
    // side-effect of stopping any copy that may be running.
    // This may fail without causing issues, so we wrap it in a subshell and add
    // "|| true" to the end so that at the top level of this chain of commands,
    // this one never fails.
    `("${flags.tizenStudioPath}"/tools/ide/bin/tizen
         uninstall -t "$DEVICE" -p genWebDriv.Container || true)`,
  ]);

  if (url) {
    // Since the URL will be quoted and used inside a bash command, we need a
    // quote-safe version of the URL with some escaping applied.  This
    // replacement will make the URL safe for inclusion in single quotes.
    // See https://stackoverflow.com/a/1250279 for an explanation.
    const quoteSafeUrl = url.replace(`'`, `'"'"'`);

    commands = commands.concat([
      // Create a temporary directory for the Tizen application source.
      // When we use a Docker image, this folder is inside Docker.
      `TMP_APP=$(mktemp -d -t tizen-webdriver-XXXXXXXX)`,
      // Copy the application template to the temporary directory.
      `cp ${appTemplatePath}/* "$TMP_APP"`,
      // Replace the iframe destination with the requested URL.
      `sed -i "$TMP_APP"/index.html -e 's@DESTINATION@${quoteSafeUrl}@'`,
      // Package the Tizen application.
      `"${flags.tizenStudioPath}"/tools/ide/bin/tizen package
           -t wgt -s "${flags.tizenStudioAuthorProfile}" -- "$TMP_APP"`,
      // Install the new version of the container app.
      `"${flags.tizenStudioPath}"/tools/ide/bin/tizen
           install -t "$DEVICE" -n "$TMP_APP"/genWebDrivContainer.wgt`,
      // Run the container app.
      `"${flags.tizenStudioPath}"/tools/ide/bin/tizen
           run -t "$DEVICE" -p genWebDriv.Container`,
    ]);
  }

  // Join the commands with "&&" to run them in a sequence until one fails.
  // Replace all newlines (used above for readability) with spaces so that bash
  // doesn't treat them as the end of a command.
  const command = commands.join(' && ').replace(/\n/g, ' ');

  if (flags.localTizenStudio) {
    // Run the command locally in bash.
    await execFile('bash', ['-c', command]);
  } else {
    // Docker on macOS will not allow arbitrary paths to be mounted into an
    // image by default.  Rather than require extra configuration, copy the app
    // template into a temporary directory first.
    const tmpDir = await tmp.dir({
      mode: 0o700,  // Only accessible to the owner
      prefix: 'tizen-webdriver-server-',
      unsafeCleanup: true,  // Remove directory contents on cleanup

      // Set the parent directory of our temporary directory.
      // On macOS, the default for this is not /tmp, but /tmp is what Docker
      // allows to be mounted without special configuration.  So we need to
      // override the default here.
      // TODO: test on Windows
      tmpdir: '/tmp',
    });

    try {
      // Copy the app template into our temp directory.
      const filenames = fs.readdirSync(hostAppTemplatePath);
      for (const filename of filenames) {
        fs.copyFileSync(
            path.resolve(hostAppTemplatePath, filename),
            path.resolve(tmpDir.path, filename));
      }

      // Run the command inside a Docker image.
      await execFile('docker', [
        'run',
        // Mount the app template into the Docker image.
        '-v', `${tmpDir.path}:${dockerImageAppTemplatePath}:ro`,
        // The name of the image.
        flags.tizenStudioDockerImage,
        // The command is then run inside bash inside the Docker image.
        'bash', '-c', command,
      ]);
    } finally {
      // Remove our temporary directory.
      tmpDir.cleanup();
    }
  }
}

/**
 * Add Tizen-specific arguments to the application's argument parser (from the
 * "yargs" module).
 *
 * @param {Yargs} yargs The argument parser object from "yargs".
 */
function addTizenArgs(yargs) {
  yargs
      .option('hostname', {
        description:
            'The Tizen hostname or IP address, with optional port number ' +
            '(default port number is 26101)',
        type: 'string',
        demandOption: true,
      })
      .option('local-tizen-studio', {
        description:
            'Use a locally-installed copy of Tizen Studio instead of a ' +
            'Docker image.\n' +
            'When using this option, you should also set --tizen-studio-path ' +
            'and --tizen-studio-author-profile.',
        type: 'boolean',
        default: false,
      })
      .option('tizen-studio-docker-image', {
        description:
            'The Tizen Studio Docker image to use.\n' +
            'When using your own Docker images, as opposed to the ones we ' +
            'provide, you should set --tizen-studio-path ' +
            'and --tizen-studio-author-profile, as well.\n' +
            'For local Tizen Studio installations, use ' +
            '--local-tizen-studio.\n',
        type: 'string',
        default: 'gcr.io/generic-webdriver-server/tizen-studio-tv-3.0',
      })
      .option('tizen-studio-path', {
        description:
            'The path to the installation of Tizen Studio, either locally, ' +
            'or within a Docker image.\n' +
            'The default is appropriate for the Tizen Studio Docker images ' +
            'we provide.',
        type: 'string',
        default: '/home/tizen/tizen-studio',  // Used in our Docker images.
      })
      .option('tizen-studio-author-profile', {
        description:
            'Tizen applications must be signed by a specific author profile. ' +
            'This is the name of the pre-existing author profile to use.\n' +
            'The default is appropriate for the Tizen Studio Docker images ' +
            'we provide.',
        type: 'string',
        default: 'author',  // Used in our Docker images.
      });
}

module.exports = {
  loadOnTizen,
  addTizenArgs,
};
