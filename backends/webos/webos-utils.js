const fs = require('fs')
const os = require('os')
const path = require('path')
const tmp = require('tmp-promise')
const util = require('util')
const wol = require('wol')

const execFile = util.promisify(require('child_process').execFile)

const hostAppTemplatePath = path.resolve(__dirname, 'app-template')

/**
 * Uses webOS CLI to connect to a webOS device, install a temporary container
 * app, and load a URL into it.
 *
 * @param {!object<string, ?>} flags Parsed command-line flags.
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @param {?string} url If non-null, install the webOS container app and load
 *   the URL into it.  If null, send the webOS device back to the home screen.
 * @return {!Promise}
 */
async function loadOnWebos(flags, log, url) {
  /**
   * We build a set of commands which will be combined and executed in bash -c.
   * For locally-installed copies of webOS CLI, these will be executed in
   * bash directly.
   *
   * @type {!Array<string>}
   */
  let commands = []

  const appTemplatePath = hostAppTemplatePath

  commands = commands.concat([
    //If the target device with a given name already exists, remove it.
    `if "${flags.webosCliPath}"/bin/ares-setup-device --list | grep -q "${flags.deviceName}"; then "${flags.webosCliPath}"/bin/ares-setup-device --remove ${flags.deviceName};fi`,

    //Add the target device
    `"${flags.webosCliPath}"/bin/ares-setup-device --add ${flags.deviceName} -i host="${flags.hostname}"`,

    //In order to connect your device to a webOS TV, pair them with passphrase. Because webOS CLI sends a prompt asking for passphrase here, I create an expect(.exp) file here and execute it.
    `printf '#!/usr/bin/expect -f\nset timeout -1\nspawn ${flags.webosCliPath}/bin/ares-novacom --device ${flags.deviceName} --getkey\nexpect "input passphrase"\nsend -- ${flags.passphrase}; send "\r"\nexpect eof' > ${flags.deviceName}.exp`,

    `chmod +x ./${flags.deviceName}.exp`,

    `./${flags.deviceName}.exp`,

    `rm ./${flags.deviceName}.exp`
  ])

  if (url) {
    // Since the URL will be quoted and used inside a bash command, we need a
    // quote-safe version of the URL with some escaping applied.  This
    // replacement will make the URL safe for inclusion in single quotes.
    // See https://stackoverflow.com/a/1250279 for an explanation.
    const quoteSafeUrl = url.replace(`'`, `'"'"'`)

    commands = commands.concat([
      // Create a temporary directory for the webOS application source.
      `TMP_APP=$(mktemp -d -t webos-webdriver-XXXXXXXX)`,
      // Copy the application template to the temporary directory.
      `cp ${appTemplatePath}/* "$TMP_APP"`,
      // Replace the location href address with the requested URL.
      // Warning: command below is changed, because it doesn't work in macOS.
      // see https://stackoverflow.com/a/21243111
      `sed -i '' 's@DESTINATION@${quoteSafeUrl}@' "$TMP_APP"/index.html`,
      // Package the webOS application.
      `"${flags.webosCliPath}"/bin/ares-package "$TMP_APP" -o "$TMP_APP"`,
      // Install the new version of the container app.
      `"${flags.webosCliPath}"/bin/ares-install -d ${flags.deviceName} "$TMP_APP"/com.domain.app_0.0.1_all.ipk`,
      // Run the container app.
      `"${flags.webosCliPath}"/bin/ares-launch -d ${flags.deviceName} com.domain.app`,
    ])
  }

  // Join the commands with "&&" to run them in a sequence until one fails.
  const command = commands.join(' && ')

  await execFile('bash', ['-c', command])
}

/**
 * Add webOS-specific arguments to the application's argument parser (from the
 * "yargs" module).
 *
 * @param {Yargs} yargs The argument parser object from "yargs".
 */
function addWebosArgs(yargs) {
  yargs
    .option('hostname', {
      description: 'The webOS hostname or IP address',
      type: 'string',
      demandOption: true,
    })
    .option('webos-cli-path', {
      description: 'The directory of the webOS CLI',
      type: 'string',
      demandOption: true,
    })
    .option('device-name', {
      description: 'Device name of your choice',
      type: 'string',
      default: 'webos_tv',
    })
    .option('passphrase', {
      description:
        'Passphrase from webOS "Developer App" on target device. You have to switch on "Key Server" to successfully authenticate your computer with passphrase. See https://webostv.developer.lge.com/develop/app-test/using-devmode-app/#connectingTVandPC',
      type: 'string',
      demandOption: true,
    })
}


module.exports = {
  loadOnWebos,
  addWebosArgs,
}
