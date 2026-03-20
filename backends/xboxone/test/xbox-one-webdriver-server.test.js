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

// Mock xbox-one-utils, keeping real exports but replacing I/O functions.
jest.mock('../xbox-one-utils', () => ({
  ...jest.requireActual('../xbox-one-utils'),
  checkPlatformRequirements: jest.fn(),
  loadOnXboxOne: jest.fn().mockResolvedValue(),
  takeScreenshot: jest.fn().mockResolvedValue(Buffer.from('fake-png')),
}));

const {
  checkPlatformRequirements,
  loadOnXboxOne,
  takeScreenshot,
} = require('../xbox-one-utils');

process.argv = [
  'node', 'test',
  '--port', '4444',
  '--hostname', '1.2.3.4',
  '--username', 'testuser',
  '--password', 'testpass',
  '--msbuild', '/path/to/msbuild',
];

const {XboxOneWebDriverServer} = require('../xbox-one-webdriver-server');

describe('XboxOneWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new XboxOneWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('constructor calls checkPlatformRequirements', () => {
    jest.clearAllMocks();
    expect(() => new XboxOneWebDriverServer()).not.toThrow();
    expect(checkPlatformRequirements).toHaveBeenCalled();
  });

  it('navigateToSingleSession calls loadOnXboxOne with the URL',
      async () => {
        await server.navigateToSingleSession('http://example.com');
        expect(loadOnXboxOne).toHaveBeenCalledWith(
            expect.any(Object), expect.any(Object), 'http://example.com');
      });

  it('closeSingleSession calls loadOnXboxOne with null', async () => {
    await server.closeSingleSession();
    expect(loadOnXboxOne).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), null);
  });

  it('screenshot delegates to takeScreenshot with credentials', async () => {
    const result = await server.screenshot('session-id');
    expect(takeScreenshot).toHaveBeenCalledWith('1.2.3.4', 'testuser',
        'testpass');
    expect(result.toString()).toBe('fake-png');
  });
});
