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

jest.mock('yargs', () => {
  const original = jest.requireActual('yargs');
  return {
    ...original,
    argv: {
      port: 1234,
      idleTimeoutSeconds: 120,
    },
    parse: jest.fn().mockReturnValue({
      port: 1234,
      idleTimeoutSeconds: 120,
    }),
  };
});

const {
  GenericWebDriverServer,
  GenericSingleSessionWebDriverServer,
  InvalidSessionIdError,
} = require('./generic-webdriver-server');

describe('GenericWebDriverServer', () => {
  let server;

  beforeEach(() => {
    server = new GenericWebDriverServer();
  });

  afterEach(() => {
    if (server.server) {
      server.server.close();
    }
  });

  test('constructor initializes app and log', () => {
    expect(server.app).toBeDefined();
    expect(server.log).toBeDefined();
    expect(server.flags.port).toBe(1234);
  });

  test('GET /status calls ready()', async () => {
    const readySpy = jest.spyOn(server, 'ready').mockResolvedValue(true);
    const response = await request(server.app).get('/status');

    expect(readySpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      value: {
        ready: true,
        message: 'ok',
      },
    });
  });

  test('GET /status returns busy when not ready', async () => {
    jest.spyOn(server, 'ready').mockResolvedValue(false);
    const response = await request(server.app).get('/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      value: {
        ready: false,
        message: 'busy',
      },
    });
  });

  test('POST /session calls createSession()', async () => {
    const createSpy = jest.spyOn(server, 'createSession')
        .mockResolvedValue('test-session-id');
    const response = await request(server.app).post('/session').send({});

    expect(createSpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body.value.sessionId).toBe('test-session-id');
  });

  test('POST /session returns error when createSession fails', async () => {
    jest.spyOn(server, 'createSession').mockResolvedValue(null);
    const response = await request(server.app).post('/session').send({});

    expect(response.status).toBe(500);
    expect(response.body.value.error).toBe('session not created');
  });

  test('POST /session/:sessionId/url calls navigateTo()', async () => {
    const navigateSpy = jest.spyOn(server, 'navigateTo').mockResolvedValue();
    const response = await request(server.app)
        .post('/session/abc/url')
        .send({url: 'http://example.com'});

    expect(navigateSpy).toHaveBeenCalledWith('abc', 'http://example.com');
    expect(response.status).toBe(200);
  });

  test('POST /session/:sessionId/url returns error for missing url',
      async () => {
        const navigateSpy = jest.spyOn(server, 'navigateTo');
        const response = await request(server.app)
            .post('/session/abc/url')
            .send({});

        expect(navigateSpy).not.toHaveBeenCalled();
        expect(response.status).toBe(400);
        expect(response.body.value.error).toBe('invalid argument');
      });

  test('GET /session/:sessionId/title calls getTitle()', async () => {
    const titleSpy = jest.spyOn(server, 'getTitle')
        .mockResolvedValue('Mock Title');
    const response = await request(server.app).get('/session/abc/title');

    expect(titleSpy).toHaveBeenCalledWith('abc');
    expect(response.status).toBe(200);
    expect(response.body.value).toBe('Mock Title');
  });

  test('DELETE /session/:sessionId calls closeSession()', async () => {
    const closeSpy = jest.spyOn(server, 'closeSession').mockResolvedValue();
    const response = await request(server.app).delete('/session/abc');

    expect(closeSpy).toHaveBeenCalledWith('abc');
    expect(response.status).toBe(200);
  });

  test('Unknown routes return UnknownCommandError', async () => {
    const response = await request(server.app).get('/unknown/route');
    expect(response.status).toBe(404);
    expect(response.body.value.error).toBe('unknown command');
  });
});

describe('GenericSingleSessionWebDriverServer', () => {
  let server;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new GenericSingleSessionWebDriverServer();
    // We need to mock these as they throw by default in the base class
    jest.spyOn(server, 'navigateToSingleSession').mockResolvedValue();
    jest.spyOn(server, 'closeSingleSession').mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('manages a single session', async () => {
    // Initially ready
    expect(await server.ready()).toBe(true);

    // Create session
    const sessionId = await server.createSession();
    expect(sessionId).toBeDefined();
    expect(await server.ready()).toBe(false);

    // Cannot create second session
    const secondSessionId = await server.createSession();
    expect(secondSessionId).toBeNull();

    // Close session
    await server.closeSession(sessionId);
    expect(await server.ready()).toBe(true);
  });

  test('refuses navigation for invalid session ID', async () => {
    expect.assertions(1);
    await server.createSession();
    try {
      await server.navigateTo('wrong-id', 'url');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSessionIdError);
    }
  });

  test('automatically closes session after idle timeout', async () => {
    const sessionId = await server.createSession();
    expect(await server.ready()).toBe(false);

    // Fast-forward time
    jest.advanceTimersByTime(121 * 1000); // Default is 120s

    expect(await server.ready()).toBe(true);
  });
});
