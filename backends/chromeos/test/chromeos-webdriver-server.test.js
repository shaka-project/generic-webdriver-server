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

// Mock chromeos-utils, keeping real exports but replacing I/O functions.
jest.mock('../chromeos-utils', () => ({
  ...jest.requireActual('../chromeos-utils'),
  fetchPrivateKey: jest.fn().mockResolvedValue(),
  connectAndPrepDevice: jest.fn().mockResolvedValue({dispose: jest.fn()}),
  loadOnChromeOS: jest.fn().mockResolvedValue(),
  loadChromeOSLoginScreen: jest.fn().mockResolvedValue(),
}));

const {
  fetchPrivateKey,
  connectAndPrepDevice,
  loadOnChromeOS,
  loadChromeOSLoginScreen,
} = require('../chromeos-utils');

process.argv = [
  'node', 'test', '--port', '4444', '--hostname', '192.168.1.100',
];

const {ChromeOSWebDriverServer} = require('../chromeos-webdriver-server');

describe('ChromeOSWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new ChromeOSWebDriverServer();
    jest.clearAllMocks();
    // Reset connectAndPrepDevice mock to return a fresh SSH stub each time.
    connectAndPrepDevice.mockResolvedValue({dispose: jest.fn()});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('createSession calls fetchPrivateKey and connectAndPrepDevice',
      async () => {
        const sessionId = await server.createSession();
        expect(typeof sessionId).toBe('string');
        expect(fetchPrivateKey).toHaveBeenCalled();
        expect(connectAndPrepDevice).toHaveBeenCalled();
      });

  it('navigateToSingleSession calls loadOnChromeOS with ssh and url',
      async () => {
        const fakeSsh = {dispose: jest.fn()};
        server.ssh_ = fakeSsh;
        await server.navigateToSingleSession('http://example.com');
        expect(loadOnChromeOS).toHaveBeenCalledWith(
            expect.any(Object), fakeSsh,
            'http://example.com', expect.any(Array));
      });

  it('closeSingleSession calls loadChromeOSLoginScreen and cleans up',
      async () => {
        const fakeSsh = {dispose: jest.fn()};
        server.ssh_ = fakeSsh;
        await server.closeSingleSession();
        expect(loadChromeOSLoginScreen).toHaveBeenCalled();
        expect(fakeSsh.dispose).toHaveBeenCalled();
        expect(server.ssh_).toBeNull();
      });
});
