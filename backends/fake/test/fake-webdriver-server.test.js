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

process.argv = ['node', 'test', '--port', '4444', '--foo', 'testfoo'];

const {FakeWebDriverServer} = require('../fake-webdriver-server');

describe('FakeWebDriverServer', () => {
  let server;

  beforeEach(() => {
    server = new FakeWebDriverServer();
  });

  it('ready() always returns true', async () => {
    expect(await server.ready()).toBe(true);
  });

  it('createSession() returns a non-empty hex string', async () => {
    const id = await server.createSession();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it('navigateTo() resolves without error', async () => {
    await expect(server.navigateTo('any-id', 'http://example.com'))
        .resolves.not.toThrow();
  });

  it('screenshot() returns a Buffer', async () => {
    const png = await server.screenshot('any-id');
    expect(Buffer.isBuffer(png)).toBe(true);
  });

  it('getTitle() includes the --foo flag value', async () => {
    const title = await server.getTitle('any-id');
    expect(title).toBe('Title of the page / testfoo');
  });

  it('closeSession() resolves without error', async () => {
    await expect(server.closeSession('any-id')).resolves.not.toThrow();
  });
});
