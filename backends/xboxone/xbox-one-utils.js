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


const FormData = require('form-data');
const fs = require('fs-extra');
const https = require('https');
const os = require('os');
const path = require('path');
const tmp = require('tmp-promise');
const util = require('util');

const execFile = util.promisify(require('child_process').execFile);

const appTemplatePath = path.resolve(__dirname, 'app-template');
const appId = '25796bff-2d0c-4ce0-82f4-862db940a2fd_38r8bc51r0hnm!App';
const appIdBase64 = Buffer.from(appId, 'utf8').toString('base64');
const packageId =
    '25796bff-2d0c-4ce0-82f4-862db940a2fd_1.0.0.0_x64__38r8bc51r0hnm';
const defaultPort = 11443;  // For the Xbox One Device Portal
const packageFolderName = 'XboxOneWebDriverServer_1.0.0.0_Test';
const packageBundleName = 'XboxOneWebDriverServer_1.0.0.0_x64.msixbundle';

// Main API reference docs:
// https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core
// https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/reference


/**
 * Uses Visual Studio to connect to an Xbox One device, install a temporary UWP
 * container app, and load a URL into it.
 *
 * @param {!object<string, ?>} flags Parsed command-line flags.
 * @param {Console} log A Console-like interface for logging.  Can be "console".
 * @param {?string} url If non-null, install the Xbox One container app and load
 *   the URL into it.  If null, send the Xbox One device back to the home
 *   screen.
 * @return {!Promise}
 */
async function loadOnXboxOne(flags, log, url) {
  checkPlatformRequirements();

  if (url) {
    // Copy the app template into a temporary directory.
    const tmpDirOptions = {
      mode: 0o700,  // Only accessible to the owner
      prefix: 'xbox-one-webdriver-server-',
      unsafeCleanup: true,  // Remove directory contents on cleanup
    };
    const tmpDir = await tmp.dir(tmpDirOptions);

    try {
      log.info('Preparing app template');
      await fs.copySync(appTemplatePath, tmpDir.path);
      setAppUrl(tmpDir.path, url);
      log.info('Building app');
      await buildApp(flags.msbuild, tmpDir.path);
      log.info('Installing app');
      await installApp(
          tmpDir.path, flags.hostname, flags.username, flags.password);
      log.info('Launching app');
      await launchApp(flags.hostname, flags.username, flags.password);
    } finally {
      // Remove our temporary directory.
      tmpDir.cleanup();
    }
  } else {
    log.info('Uninstalling app');
    await uninstallApp(flags.hostname, flags.username, flags.password);
  }
  log.info('Done');
}

/**
 * Check platform requirements for using these tools.
 *
 * @throws Error if requirements are not met.
 */
function checkPlatformRequirements() {
  if (!os.type().toLowerCase().startsWith('windows')) {
    throw new Error('Only usable on Windows!');
  }
}

/**
 * Set the URL for the application template.
 *
 * @param {string} tempPath The temp folder in which the application template
 *   can be found.
 * @param {string} url The destination URL.
 */
function setAppUrl(tempPath, url) {
  // Fill in the desired destination URL in the app source.
  const mainXamlPath = path.resolve(tempPath, 'MainPage.xaml');
  const originalXaml = fs.readFileSync(mainXamlPath).toString('utf8');
  const modifiedXaml = originalXaml.replace('DESTINATION', url);
  fs.writeFileSync(mainXamlPath, modifiedXaml);
}

/**
 * Build the application in the temp path.
 *
 * @param {string} msbuildPath The path to MSBuild.exe.
 * @param {string} tempPath The temp folder in which the application template
 *   can be found.
 * @return {!Promise}
 */
async function buildApp(msbuildPath, tempPath) {
  // Build the app using Visual Studio.
  await execFile(msbuildPath, [
    'XboxOneWebDriverServer.sln',
    '-p:Configuration=Release,Optimize=false,DebugSymbols=false',
    '-p:Platform=x64',
    '-t:Restore;Build',
  ], {
    cwd: tempPath,
  });
}

/**
 * Install the application to the specified Xbox One.
 *
 * @param {string} tempPath The temp folder in which the application template
 *   can be found.
 * @param {string} xboxOneAddress The IP or hostname of the Xbox One device.
 * @param {string} username The username to authenticate to the Device Portal.
 * @param {string} password The password to authenticate to the Device Portal.
 * @return {!Promise}
 */
async function installApp(tempPath, xboxOneAddress, username, password) {
  // Find the app bundle and its deps.
  const appBundlePath = path.resolve(
      tempPath, 'AppPackages', packageFolderName, packageBundleName);
  const depsFolderPath = path.resolve(
      tempPath, 'AppPackages', packageFolderName, 'Dependencies', 'x64');
  const depsPaths = fs.readdirSync(depsFolderPath).map(
      (filename) => path.resolve(depsFolderPath, filename));

  const formData = new FormData();
  formData.append(packageBundleName, fs.createReadStream(appBundlePath));
  for (const depPath of depsPaths) {
    formData.append(path.basename(depPath), fs.createReadStream(depPath));
  }

  // https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core#install-an-app
  await httpRequestHelper(
      xboxOneAddress, username, password,
      'POST', `api/app/packagemanager/package?package=${packageBundleName}`,
      formData);

  const startTime = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core#get-app-installation-status
    const {statusCode} = await httpRequestHelper(
        xboxOneAddress, username, password,
        'GET', 'api/app/packagemanager/state');

    // Status code will be 204 when the installation is still in progress.
    if (statusCode != 204) {
      break;
    }

    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    // Time out of this loop after 60 seconds.
    if (elapsedSeconds > 60) {
      throw new Error('Timeout while waiting for package installation!');
    }
  }
}

/**
 * Launch the application on the specified Xbox One.
 *
 * @param {string} xboxOneAddress The IP or hostname of the Xbox One device.
 * @param {string} username The username to authenticate to the Device Portal.
 * @param {string} password The password to authenticate to the Device Portal.
 * @return {!Promise}
 */
async function launchApp(xboxOneAddress, username, password) {
  // https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core#start-a-modern-app
  await httpRequestHelper(
      xboxOneAddress, username, password,
      'POST', `api/taskmanager/app?appid=${appIdBase64}`);
}

/**
 * Uninstall the application on the specified Xbox One.
 *
 * @param {string} xboxOneAddress The IP or hostname of the Xbox One device.
 * @param {string} username The username to authenticate to the Device Portal.
 * @param {string} password The password to authenticate to the Device Portal.
 * @return {!Promise}
 */
async function uninstallApp(xboxOneAddress, username, password) {
  // https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core#uninstall-an-app
  try {
    await httpRequestHelper(
        xboxOneAddress, username, password,
        'DELETE', `api/app/packagemanager/package?package=${packageId}`);
  } catch (error) {
    if (error.statusCode == 500 && error.body.includes('Element not found')) {
      // Ignore this.  There was nothing to uninstall, and that's fine.
    } else {
      throw error;
    }
  }
}

/**
 * Take a screenshot on the specified Xbox One (PNG format).
 *
 * @param {string} xboxOneAddress The IP or hostname of the Xbox One device.
 * @param {string} username The username to authenticate to the Device Portal.
 * @param {string} password The password to authenticate to the Device Portal.
 * @return {!Promise.<Buffer>}
 */
async function takeScreenshot(xboxOneAddress, username, password) {
  // https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/wdp-media-capture-api
  const {data} = await httpRequestHelper(
      xboxOneAddress, username, password,
      'GET', 'ext/screenshot?download=true&hdr=false');
  return data;
}


/**
 * A helper function to make HTTP requests to the Device Portal APIs on the Xbox
 * One device.
 *
 * @param {string} xboxOneAddress The IP or hostname of the Xbox One device.
 * @param {string} username The username to authenticate to the Device Portal.
 * @param {string} password The password to authenticate to the Device Portal.
 * @param {string} method The HTTP request method to use.
 * @param {string} path The HTTP request path to use.
 * @param {?FormData} formData Optional multipart form data for file uploads.
 * @return {!Promise<{statusCode: number, data: Buffer}>}
 */
function httpRequestHelper(
    xboxOneAddress, username, password, method, path, formData) {
  return new Promise((resolve, reject) => {
    const url = `https://${xboxOneAddress}/${path}`;
    const options = {
      defaultPort,  // if not specified in xboxOneAddress
      rejectUnauthorized: false,  // do not validate HTTPS cert
      method,
    };
    if (formData) {
      options.headers = formData.getHeaders();
    } else {
      options.headers = {};
    }

    // NOTE: auto- prefix disables requirements around CSRF tokens, to allow
    // automation on this API.
    // See https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal#csrf-protection-and-scripting
    const basicAuth = Buffer.from('auto-' + username + ':' + password, 'utf8');
    options.headers.Authorization = 'Basic ' + basicAuth.toString('base64');

    const req = https.request(url, options, (response) => {
      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        const statusCode = response.statusCode;
        const data = Buffer.concat(chunks);
        if (statusCode < 200 || statusCode > 299) {
          const error = new Error(
              `${method} ${url} => ` +
              `HTTP ${statusCode}: ${data.toString('utf8')}`);
          error.method = method;
          error.url = url;
          error.statusCode = statusCode;
          error.body = data.toString('utf8');
          reject(error);
        } else {
          resolve({statusCode, data});
        }
      });
    });

    req.on('error', reject);

    if (formData) {
      formData.pipe(req);
    } else {
      req.end();
    }
  });
}

/**
 * Try to find MSBuild.exe from Visual Studio, to simplify configuration.
 *
 * @return {?string} The path to MSBuild.exe, or null if not found.
 */
function findMsbuild() {
  const basePath = 'Program Files (x86)\\Microsoft Visual Studio\\2019';

  for (const drive of 'cdefghijklmnopqrstuvwxyz') {
    // Microsoft's VS docs call these versions of Visual Studio "Offerings".
    for (const offering of ['Enterprise', 'Professional', 'Community']) {
      const vsPath = `${drive}:\\${basePath}\\${offering}`;
      const msbuildPath = `${vsPath}\\MSBuild\\Current\\Bin\\MSBuild.exe`;
      if (fs.existsSync(msbuildPath)) {
        return msbuildPath;
      }
    }
  }

  return null;
}

/**
 * Add Xbox-One-specific arguments to the application's argument parser (from
 * the "yargs" module).
 *
 * @param {Yargs} yargs The argument parser object from "yargs".
 */
function addXboxOneArgs(yargs) {
  const msbuildPath = findMsbuild();

  yargs
      .option('hostname', {
        description:
            'The Xbox One hostname or IP address, with optional port number ' +
            '(default port number is 11443)',
        type: 'string',
        demandOption: true,
      })
      .option('username', {
        description: 'The Xbox One Device Portal username.',
        type: 'string',
        demandOption: true,
      })
      .option('password', {
        description: 'The Xbox One Device Portal password.',
        type: 'string',
        demandOption: true,
      })
      .option('msbuild', {
        description: 'The path to MSBuild.exe from Visual Studio.',
        type: 'string',
        // We try to detect the path for you, but if we fail, this becomes a
        // required argument.
        default: msbuildPath,
        demandOption: msbuildPath == null,
      });
}

module.exports = {
  checkPlatformRequirements,
  loadOnXboxOne,
  takeScreenshot,
  addXboxOneArgs,
};
