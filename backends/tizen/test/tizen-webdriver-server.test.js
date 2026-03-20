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

// Mock tizen-utils, keeping real exports but replacing loadOnTizen.
jest.mock('../tizen-utils', () => ({
  ...jest.requireActual('../tizen-utils'),
  loadOnTizen: jest.fn().mockResolvedValue(),
}));

const {loadOnTizen} = require('../tizen-utils');

process.argv = [
  'node', 'test', '--port', '4444', '--hostname', '192.168.1.200',
];

const {TizenWebDriverServer} = require('../tizen-webdriver-server');

describe('TizenWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new TizenWebDriverServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigateToSingleSession calls loadOnTizen with the URL', async () => {
    await server.navigateToSingleSession('http://example.com');
    expect(loadOnTizen).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), 'http://example.com');
  });

  it('closeSingleSession calls loadOnTizen with null', async () => {
    await server.closeSingleSession();
    expect(loadOnTizen).toHaveBeenCalledWith(
        expect.any(Object), expect.any(Object), null);
  });
});
