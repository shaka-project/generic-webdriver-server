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

// Set argv before any require so yargs.argv parses clean args.
process.argv = ['node', 'test', '--port', '4444'];

const request = require('supertest');

const {
  GenericWebDriverServer,
  InvalidSessionIdError,
} = require('../generic-webdriver-server');

// A minimal concrete subclass with controllable behavior.
class TestServer extends GenericWebDriverServer {
  constructor() {
    super();
    this.sessions = new Set();
    this.readyResult = true;
  }

  async ready() {
    return this.readyResult;
  }

  async createSession() {
    if (!this.readyResult) return null;
    this.sessions.add('sess-1');
    return 'sess-1';
  }

  async navigateTo(sessionId, url) {
    if (!this.sessions.has(sessionId)) throw new InvalidSessionIdError();
  }

  async screenshot(sessionId) {
    // Delegate to base class for unknown sessions (throws screen error).
    if (!this.sessions.has(sessionId)) return super.screenshot(sessionId);
    return Buffer.from('fakepng');
  }

  async getTitle(sessionId) {
    if (!this.sessions.has(sessionId)) throw new InvalidSessionIdError();
    return 'Test Title';
  }

  async closeSession(sessionId) {
    this.sessions.delete(sessionId);
  }
}

describe('GenericWebDriverServer HTTP routes', () => {
  let server;
  let app;

  beforeEach(() => {
    process.argv = ['node', 'test', '--port', '4444'];
    server = new TestServer();
    server.log = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    app = server.app;
  });

  describe('GET /status', () => {
    it('returns ready: true when ready', async () => {
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);
      expect(res.body.value.ready).toBe(true);
      expect(res.body.value.message).toBe('ok');
    });

    it('returns ready: false when not ready', async () => {
      server.readyResult = false;
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);
      expect(res.body.value.ready).toBe(false);
      expect(res.body.value.message).toBe('busy');
    });

    it('wraps value in {value: ...}', async () => {
      const res = await request(app).get('/status');
      expect(res.body).toHaveProperty('value');
    });
  });

  describe('POST /session', () => {
    it('creates a session and returns sessionId', async () => {
      const res = await request(app).post('/session').send({});
      expect(res.status).toBe(200);
      expect(res.body.value.sessionId).toBe('sess-1');
      expect(res.body.value.capabilities).toEqual({});
    });

    it('returns 500 when createSession returns null', async () => {
      server.readyResult = false;
      const res = await request(app).post('/session').send({});
      expect(res.status).toBe(500);
      expect(res.body.value.error).toBe('session not created');
    });
  });

  describe('POST /session/:sessionId/url', () => {
    beforeEach(async () => {
      await request(app).post('/session').send({});
    });

    it('returns success on valid session and url', async () => {
      const res = await request(app)
          .post('/session/sess-1/url')
          .send({url: 'http://example.com'});
      expect(res.status).toBe(200);
      expect(res.body.value).toEqual({});
    });

    it('returns 400 when url is missing from body', async () => {
      const res = await request(app)
          .post('/session/sess-1/url')
          .send({});
      expect(res.status).toBe(400);
      expect(res.body.value.error).toBe('invalid argument');
    });

    it('returns 404 for unknown session', async () => {
      const res = await request(app)
          .post('/session/bad-session/url')
          .send({url: 'http://example.com'});
      expect(res.status).toBe(404);
      expect(res.body.value.error).toBe('invalid session id');
    });
  });

  describe('GET /session/:sessionId/screenshot', () => {
    beforeEach(async () => {
      await request(app).post('/session').send({});
    });

    it('returns base64-encoded PNG for valid session', async () => {
      const res = await request(app).get('/session/sess-1/screenshot');
      expect(res.status).toBe(200);
      const decoded = Buffer.from(res.body.value, 'base64').toString();
      expect(decoded).toBe('fakepng');
    });

    it('returns 500 for unknown session', async () => {
      const res = await request(app).get('/session/bad-session/screenshot');
      expect(res.status).toBe(500);
      expect(res.body.value.error).toBe('unable to capture screen');
    });
  });

  describe('GET /session/:sessionId/title', () => {
    beforeEach(async () => {
      await request(app).post('/session').send({});
    });

    it('returns the page title for valid session', async () => {
      const res = await request(app).get('/session/sess-1/title');
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('Test Title');
    });

    it('returns 404 for unknown session', async () => {
      const res = await request(app).get('/session/bad-session/title');
      expect(res.status).toBe(404);
      expect(res.body.value.error).toBe('invalid session id');
    });
  });

  describe('DELETE /session/:sessionId/window', () => {
    beforeEach(async () => {
      await request(app).post('/session').send({});
    });

    it('closes the session', async () => {
      const res = await request(app).delete('/session/sess-1/window');
      expect(res.status).toBe(200);
      expect(server.sessions.has('sess-1')).toBe(false);
    });

    it('succeeds even for unknown session', async () => {
      const res = await request(app).delete('/session/bad-session/window');
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /session/:sessionId', () => {
    beforeEach(async () => {
      await request(app).post('/session').send({});
    });

    it('closes the session', async () => {
      const res = await request(app).delete('/session/sess-1');
      expect(res.status).toBe(200);
      expect(server.sessions.has('sess-1')).toBe(false);
    });
  });

  describe('unknown routes', () => {
    it('returns 404 with unknown command error', async () => {
      const res = await request(app).get('/not/a/real/route');
      expect(res.status).toBe(404);
      expect(res.body.value.error).toBe('unknown command');
    });

    it('catches thrown errors and returns unknown error', async () => {
      server.ready = async () => {
        throw new Error('unexpected failure');
      };
      const res = await request(app).get('/status');
      expect(res.status).toBe(500);
      expect(res.body.value.error).toBe('unknown error');
    });
  });
});
