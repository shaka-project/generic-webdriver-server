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

// Mock tizen-utils
jest.mock('./tizen-utils', () => {
  const original = jest.requireActual('./tizen-utils');
  return {
    ...original,
    loadOnTizen: jest.fn().mockResolvedValue(),
  };
});

const {loadOnTizen} = require('./tizen-utils');

// Set process.argv before requiring the server
process.argv = [
  'node', 'test.js',
  '--port', '1234',
  '--hostname', '1.2.3.4',
];

const {TizenWebDriverServer} = require('./tizen-webdriver-server');

describe('TizenWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new TizenWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (server.server) {
      server.server.close();
    }
    jest.useRealTimers();
  });

  test('navigateToSingleSession calls loadOnTizen', async () => {
    await server.navigateToSingleSession('http://example.com');
    expect(loadOnTizen).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), 'http://example.com');
  });

  test('closeSingleSession calls loadOnTizen with null url', async () => {
    await server.closeSingleSession();
    expect(loadOnTizen).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), null);
  });
});
