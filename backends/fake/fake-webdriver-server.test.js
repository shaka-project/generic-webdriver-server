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

const request = require('supertest');

// Set process.argv before requiring the server
process.argv = ['node', 'test.js', '--port', '1234', '--foo', 'mock-foo'];

const {FakeWebDriverServer} = require('./fake-webdriver-server');

describe('FakeWebDriverServer', () => {
  let server;

  beforeEach(() => {
    server = new FakeWebDriverServer();
  });

  afterEach(() => {
    if (server.server) {
      server.server.close();
    }
  });

  test('ready() always returns true', async () => {
    expect(await server.ready()).toBe(true);
  });

  test('createSession() returns a session ID', async () => {
    const sessionId = await server.createSession();
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
  });

  test('navigateTo() succeeds', async () => {
    await expect(server.navigateTo('any-id', 'http://example.com'))
        .resolves.not.toThrow();
  });

  test('screenshot() returns a buffer', async () => {
    const png = await server.screenshot('any-id');
    expect(Buffer.isBuffer(png)).toBe(true);
  });

  test('getTitle() returns a title with foo flag', async () => {
    const title = await server.getTitle('any-id');
    expect(title).toBe('Title of the page / mock-foo');
  });

  test('full integration via supertest', async () => {
    const response = await request(server.app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body.value.ready).toBe(true);

    const sessionResponse = await request(server.app).post('/session').send({});
    expect(sessionResponse.status).toBe(200);
    const sessionId = sessionResponse.body.value.sessionId;
    expect(sessionId).toBeDefined();

    const navResponse = await request(server.app)
        .post(`/session/${sessionId}/url`)
        .send({url: 'http://test.com'});
    expect(navResponse.status).toBe(200);
  });
});
