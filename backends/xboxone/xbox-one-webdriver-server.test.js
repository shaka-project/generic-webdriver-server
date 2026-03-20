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

// Mock os to pretend we are on Windows
jest.mock('os', () => {
  const original = jest.requireActual('os');
  return {
    ...original,
    type: jest.fn().mockReturnValue('Windows_NT'),
  };
});

// Mock xbox-one-utils
jest.mock('./xbox-one-utils', () => {
  const original = jest.requireActual('./xbox-one-utils');
  return {
    ...original,
    checkPlatformRequirements: jest.fn(),
    loadOnXboxOne: jest.fn().mockResolvedValue(),
    takeScreenshot: jest.fn().mockResolvedValue(Buffer.from('mock-png')),
    // findMsbuild is called during module load, so we might need to mock it if
    // it causes issues.
  };
});

const {loadOnXboxOne, takeScreenshot} = require('./xbox-one-utils');

// Set process.argv before requiring the server
process.argv = [
  'node', 'test.js',
  '--port', '1234',
  '--hostname', '1.2.3.4',
  '--username', 'user',
  '--password', 'pass',
  '--msbuild', 'C:\\msbuild.exe',
];

const {XboxOneWebDriverServer} = require('./xbox-one-webdriver-server');

describe('XboxOneWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new XboxOneWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (server.server) {
      server.server.close();
    }
    jest.useRealTimers();
  });

  test('navigateToSingleSession calls loadOnXboxOne', async () => {
    await server.navigateToSingleSession('http://example.com');
    expect(loadOnXboxOne).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), 'http://example.com');
  });

  test('closeSingleSession calls loadOnXboxOne with null url', async () => {
    await server.closeSingleSession();
    expect(loadOnXboxOne).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), null);
  });

  test('screenshot calls takeScreenshot', async () => {
    const png = await server.screenshot('session-id');
    expect(png.toString()).toBe('mock-png');
    expect(takeScreenshot).toHaveBeenCalledWith('1.2.3.4', 'user', 'pass');
  });
});
