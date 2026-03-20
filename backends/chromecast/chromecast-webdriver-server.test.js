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

const {Mode} = require('./cast-utils');

// Mock cast-utils
jest.mock('./cast-utils', () => {
  const original = jest.requireActual('./cast-utils');
  return {
    ...original,
    cast: jest.fn().mockResolvedValue(),
  };
});

const {cast} = require('./cast-utils');

// Set process.argv before requiring the server
process.argv = [
  'node', 'test.js',
  '--port', '1234',
  '--hostname', '1.2.3.4',
];

const {ChromecastWebDriverServer} = require('./chromecast-webdriver-server');

describe('ChromecastWebDriverServer', () => {
  let server;

  beforeEach(() => {
    server = new ChromecastWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (server.server) {
      server.server.close();
    }
  });

  test('navigateToSingleSession calls cast with URL mode', async () => {
    await server.navigateToSingleSession('http://example.com');
    expect(cast).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), Mode.URL, 'http://example.com');
  });

  test('closeSingleSession calls cast with HOME mode', async () => {
    await server.closeSingleSession();
    expect(cast).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), Mode.HOME);
  });
});
