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

// Mock cast-utils, keeping real exports but replacing cast with a spy.
jest.mock('../cast-utils', () => ({
  ...jest.requireActual('../cast-utils'),
  cast: jest.fn().mockResolvedValue(),
}));

const {cast, Mode} = require('../cast-utils');

process.argv = [
  'node', 'test', '--port', '4444', '--hostname', '192.168.1.100',
];

const {ChromecastWebDriverServer} =
    require('../chromecast-webdriver-server');

describe('ChromecastWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new ChromecastWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigateToSingleSession calls cast with Mode.URL and the URL',
      async () => {
        await server.navigateToSingleSession('http://example.com');
        expect(cast).toHaveBeenCalledWith(
            expect.any(Object), expect.any(Object),
            Mode.URL, 'http://example.com');
      });

  it('closeSingleSession calls cast with Mode.HOME', async () => {
    await server.closeSingleSession();
    expect(cast).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), Mode.HOME);
  });
});
