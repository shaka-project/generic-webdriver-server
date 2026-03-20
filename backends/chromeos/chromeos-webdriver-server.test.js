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

// Mock chromeos-utils
jest.mock('./chromeos-utils', () => {
  const original = jest.requireActual('./chromeos-utils');
  return {
    ...original,
    fetchPrivateKey: jest.fn().mockResolvedValue(),
    connectAndPrepDevice: jest.fn().mockResolvedValue({
      dispose: jest.fn(),
    }),
    loadOnChromeOS: jest.fn().mockResolvedValue(),
    loadChromeOSLoginScreen: jest.fn().mockResolvedValue(),
  };
});

const {
  fetchPrivateKey,
  connectAndPrepDevice,
  loadOnChromeOS,
  loadChromeOSLoginScreen,
} = require('./chromeos-utils');

// Set process.argv before requiring the server
process.argv = [
  'node', 'test.js',
  '--port', '1234',
  '--hostname', '1.2.3.4',
];

const {ChromeOSWebDriverServer} = require('./chromeos-webdriver-server');

describe('ChromeOSWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new ChromeOSWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (server.server) {
      server.server.close();
    }
    jest.useRealTimers();
  });

  test('createSession calls prep utils', async () => {
    const sessionId = await server.createSession();
    expect(sessionId).toBeDefined();
    expect(fetchPrivateKey).toHaveBeenCalled();
    expect(connectAndPrepDevice).toHaveBeenCalled();
  });

  test('navigateToSingleSession calls loadOnChromeOS', async () => {
    // We need to set ssh_ as if createSession was called
    server.ssh_ = {dispose: jest.fn()};
    await server.navigateToSingleSession('http://example.com');
    expect(loadOnChromeOS).toHaveBeenCalledWith(
        expect.any(Object), server.ssh_, 'http://example.com', expect.any(Array));
  });

  test('closeSingleSession calls login screen util', async () => {
    server.ssh_ = {dispose: jest.fn()};
    const disposeSpy = server.ssh_.dispose;
    await server.closeSingleSession();
    expect(loadChromeOSLoginScreen).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object));
    expect(disposeSpy).toHaveBeenCalled();
    expect(server.ssh_).toBeNull();
  });
});
