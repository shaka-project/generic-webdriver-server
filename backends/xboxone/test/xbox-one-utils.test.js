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

jest.mock('child_process');
jest.mock('fs-extra');
jest.mock('tmp-promise');
jest.mock('form-data', () => jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({}),
  pipe: jest.fn(),
})));
// Preserve real os behavior (needed by tmp-promise at load time) but allow
// mocking os.type() in tests.
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  type: jest.fn(),
}));
jest.mock('https');

const childProcess = require('child_process');
const fs = require('fs-extra');
const tmp = require('tmp-promise');
const os = require('os');
const https = require('https');

const {
  ERROR_INSTALL_REGISTRATION_FAILURE,
  checkPlatformRequirements,
  takeScreenshot,
} = require('../xbox-one-utils');

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const flags = {
  hostname: '192.168.1.10',
  username: 'admin',
  password: 'secret',
  msbuild: 'C:\\MSBuild.exe',
};

// Helper: set up https.request to respond with the given status and body.
const mockHttpResponse = (statusCode, body = '') => {
  const mockReq = {on: jest.fn(), end: jest.fn(), pipe: jest.fn()};
  https.request.mockImplementation((url, options, responseCb) => {
    const chunks = [Buffer.from(body)];
    const mockRes = {
      statusCode,
      on: jest.fn((event, cb) => {
        if (event === 'data') chunks.forEach((c) => cb(c));
        if (event === 'end') cb();
      }),
    };
    responseCb(mockRes);
    return mockReq;
  });
};

describe('checkPlatformRequirements()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not throw on Windows', () => {
    os.type.mockReturnValue('Windows_NT');
    expect(() => checkPlatformRequirements()).not.toThrow();
  });

  it('throws on Linux', () => {
    os.type.mockReturnValue('Linux');
    expect(() => checkPlatformRequirements())
        .toThrow('Only usable on Windows!');
  });

  it('throws on macOS', () => {
    os.type.mockReturnValue('Darwin');
    expect(() => checkPlatformRequirements())
        .toThrow('Only usable on Windows!');
  });
});

describe('takeScreenshot()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('makes a GET request to the screenshot endpoint', async () => {
    const fakeImage = Buffer.from('PNG_DATA');
    mockHttpResponse(200, fakeImage.toString());

    await takeScreenshot(flags.hostname, flags.username, flags.password);

    expect(https.request).toHaveBeenCalledWith(
        expect.stringContaining('ext/screenshot'),
        expect.any(Object),
        expect.any(Function));
  });

  it('returns a Buffer with the screenshot data', async () => {
    const fakeImage = Buffer.from('PNG_DATA');
    mockHttpResponse(200, fakeImage.toString());

    const result = await takeScreenshot(
        flags.hostname, flags.username, flags.password);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('includes Basic auth header with auto- prefix', async () => {
    mockHttpResponse(200, '');

    await takeScreenshot(flags.hostname, flags.username, flags.password);

    const options = https.request.mock.calls[0][1];
    expect(options.headers.Authorization).toMatch(/^Basic /);

    // Decode and verify the auto- prefix.
    const encoded = options.headers.Authorization.replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toMatch(/^auto-/);
    expect(decoded).toContain(flags.username);
    expect(decoded).toContain(flags.password);
  });

  it('rejects on non-2xx HTTP status', async () => {
    mockHttpResponse(500, 'Internal Server Error');

    await expect(
        takeScreenshot(flags.hostname, flags.username, flags.password))
        .rejects.toThrow('HTTP 500');
  });
});

describe('loadOnXboxOne()', () => {
  const {loadOnXboxOne} = require('../xbox-one-utils');
  const tmpPath = 'C:\\Temp\\xbox-one-webdriver-XXXXX';

  beforeEach(() => {
    os.type.mockReturnValue('Windows_NT');

    tmp.dir.mockResolvedValue({
      path: tmpPath,
      cleanup: jest.fn(),
    });

    // fs.copySync is used (from fs-extra).
    fs.copySync.mockImplementation(() => {});

    // fs.readFileSync returns XAML with DESTINATION placeholder.
    fs.readFileSync.mockReturnValue(
        '<WebView Source="DESTINATION" />');
    fs.writeFileSync.mockImplementation(() => {});

    // fs.readdirSync returns a list of dep files.
    fs.readdirSync.mockReturnValue(['dep1.appx']);
    fs.createReadStream.mockReturnValue({pipe: jest.fn()});

    // execFile succeeds by default.
    childProcess.execFile.mockImplementation((file, args, optOrCb, cb) => {
      const callback = typeof optOrCb === 'function' ? optOrCb : cb;
      callback(null, '', '');
    });

    // HTTP: POST for install returns 200, GET for state returns 200 (done),
    // POST for launch returns 200.
    mockHttpResponse(200, '{}');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with a URL (install path)', () => {
    it('copies the app template to a temp directory', async () => {
      await loadOnXboxOne(flags, log, 'http://example.com');
      expect(fs.copySync).toHaveBeenCalled();
    });

    it('replaces DESTINATION in the XAML with the URL', async () => {
      await loadOnXboxOne(flags, log, 'http://example.com');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.any(String),
          '<WebView Source="http://example.com" />');
    });

    it('runs MSBuild with the correct solution and flags', async () => {
      await loadOnXboxOne(flags, log, 'http://example.com');

      const msbuildCall = childProcess.execFile.mock.calls.find(
          (c) => c[0] === flags.msbuild);
      expect(msbuildCall).toBeDefined();
      const msbuildArgs = msbuildCall[1];
      expect(msbuildArgs.some((a) => a.includes('Release'))).toBe(true);
      expect(msbuildArgs).toContain('-t:Restore;Build');
    });

    it('posts to the package manager install endpoint', async () => {
      await loadOnXboxOne(flags, log, 'http://example.com');

      const postCalls = https.request.mock.calls.filter(
          (c) => c[1].method === 'POST' &&
                 c[0].includes('packagemanager/package'));
      expect(postCalls.length).toBeGreaterThan(0);
    });

    it('posts to the taskmanager app endpoint to launch', async () => {
      await loadOnXboxOne(flags, log, 'http://example.com');

      const launchCalls = https.request.mock.calls.filter(
          (c) => c[1].method === 'POST' &&
                 c[0].includes('taskmanager/app'));
      expect(launchCalls.length).toBeGreaterThan(0);
    });

    it('cleans up the temp directory after success', async () => {
      const mockCleanup = jest.fn();
      tmp.dir.mockResolvedValue({path: tmpPath, cleanup: mockCleanup});

      await loadOnXboxOne(flags, log, 'http://example.com');
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('cleans up the temp directory even on build failure', async () => {
      const mockCleanup = jest.fn();
      tmp.dir.mockResolvedValue({path: tmpPath, cleanup: mockCleanup});

      childProcess.execFile.mockImplementation((file, args, optOrCb, cb) => {
        const callback = typeof optOrCb === 'function' ? optOrCb : cb;
        callback(new Error('build failed'));
      });

      await expect(loadOnXboxOne(flags, log, 'http://example.com'))
          .rejects.toThrow('build failed');
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('without a URL (uninstall path)', () => {
    it('sends a DELETE to the package manager endpoint', async () => {
      await loadOnXboxOne(flags, log, null);

      const deleteCalls = https.request.mock.calls.filter(
          (c) => c[1].method === 'DELETE');
      expect(deleteCalls.length).toBeGreaterThan(0);
      expect(deleteCalls[0][0]).toContain('packagemanager/package');
    });

    it('does not run MSBuild', async () => {
      await loadOnXboxOne(flags, log, null);

      const msbuildCalls = childProcess.execFile.mock.calls.filter(
          (c) => c[0] === flags.msbuild);
      expect(msbuildCalls).toHaveLength(0);
    });

    it('ignores "Element not found" uninstall errors', async () => {
      // Simulate "nothing to uninstall" response.
      const mockReq = {on: jest.fn(), end: jest.fn(), pipe: jest.fn()};
      https.request.mockImplementation((url, options, responseCb) => {
        const mockRes = {
          statusCode: 500,
          on: jest.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('Element not found'));
            if (event === 'end') cb();
          }),
        };
        responseCb(mockRes);
        return mockReq;
      });

      await expect(loadOnXboxOne(flags, log, null)).resolves.toBeUndefined();
    });
  });

  describe('launch retry logic', () => {
    it('retries launch on ERROR_INSTALL_REGISTRATION_FAILURE', async () => {
      jest.useFakeTimers();

      let launchAttempts = 0;

      // First POST for install returns 200, GET for state returns 200.
      // Launch: first attempt fails with the specific error, second succeeds.
      const mockReq = {on: jest.fn(), end: jest.fn(), pipe: jest.fn()};
      https.request.mockImplementation((url, options, responseCb) => {
        let body = '{}';
        let statusCode = 200;

        if (options.method === 'POST' && url.includes('taskmanager')) {
          launchAttempts++;
          if (launchAttempts === 1) {
            statusCode = 500;
            body = JSON.stringify({ErrorCode: ERROR_INSTALL_REGISTRATION_FAILURE});
          }
        }

        const bodyBuffer = Buffer.from(body);
        const mockRes = {
          statusCode,
          on: jest.fn((event, cb) => {
            if (event === 'data') cb(bodyBuffer);
            if (event === 'end') cb();
          }),
        };
        responseCb(mockRes);
        return mockReq;
      });

      // runAllTimersAsync() advances fake timers and flushes pending promises,
      // allowing the retry delay to elapse without real waiting.
      await Promise.all([
        loadOnXboxOne(flags, log, 'http://example.com'),
        jest.runAllTimersAsync(),
      ]);

      expect(launchAttempts).toBe(2);

      jest.useRealTimers();
    });
  });
});
