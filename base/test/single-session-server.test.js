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
process.argv = ['node', 'test', '--port', '4444',
  '--idle-timeout-seconds', '10'];

const request = require('supertest');

const {
  GenericSingleSessionWebDriverServer,
} = require('../generic-webdriver-server');

// Minimal concrete subclass.
class TestSingleSessionServer extends GenericSingleSessionWebDriverServer {
  constructor() {
    super();
    this.navigateCalls = [];
    this.closeCalls = 0;
    this.shutdownCalls = 0;
  }

  async navigateToSingleSession(url) {
    this.navigateCalls.push(url);
  }

  async closeSingleSession() {
    this.closeCalls++;
  }

  async shutdownSingleSession() {
    this.shutdownCalls++;
  }
}

describe('GenericSingleSessionWebDriverServer', () => {
  let server;
  let app;

  beforeEach(() => {
    process.argv = ['node', 'test', '--port', '4444',
      '--idle-timeout-seconds', '10'];
    jest.useFakeTimers();
    server = new TestSingleSessionServer();
    server.log = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    app = server.app;
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clean up any open timeout to avoid interference.
    if (server.timeout_) {
      clearTimeout(server.timeout_);
    }
  });

  describe('ready()', () => {
    it('is ready before any session is created', async () => {
      const res = await request(app).get('/status');
      expect(res.body.value.ready).toBe(true);
    });

    it('is not ready while a session is active', async () => {
      await request(app).post('/session').send({});
      const res = await request(app).get('/status');
      expect(res.body.value.ready).toBe(false);
    });

    it('is ready again after the session is closed', async () => {
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;
      await request(app).delete(`/session/${id}`);
      const res = await request(app).get('/status');
      expect(res.body.value.ready).toBe(true);
    });
  });

  describe('createSession()', () => {
    it('returns a non-empty string session ID', async () => {
      const res = await request(app).post('/session').send({});
      expect(res.status).toBe(200);
      expect(typeof res.body.value.sessionId).toBe('string');
      expect(res.body.value.sessionId.length).toBeGreaterThan(0);
    });

    it('generates a hex session ID', async () => {
      const res = await request(app).post('/session').send({});
      expect(res.body.value.sessionId).toMatch(/^[0-9a-f]+$/);
    });

    it('returns session not created when already active', async () => {
      await request(app).post('/session').send({});
      const res = await request(app).post('/session').send({});
      expect(res.status).toBe(500);
      expect(res.body.value.error).toBe('session not created');
    });
  });

  describe('navigateTo()', () => {
    it('calls navigateToSingleSession with the URL', async () => {
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;

      await request(app)
          .post(`/session/${id}/url`)
          .send({url: 'http://example.com'});

      expect(server.navigateCalls).toContain('http://example.com');
    });

    it('returns 404 for wrong session ID', async () => {
      await request(app).post('/session').send({});
      const res = await request(app)
          .post('/session/wrong-id/url')
          .send({url: 'http://example.com'});
      expect(res.status).toBe(404);
      expect(res.body.value.error).toBe('invalid session id');
    });

    it('returns 404 when no session is active', async () => {
      const res = await request(app)
          .post('/session/any-id/url')
          .send({url: 'http://example.com'});
      expect(res.status).toBe(404);
    });
  });

  describe('getTitle()', () => {
    it('returns a title string for the active session', async () => {
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;

      const res = await request(app).get(`/session/${id}/title`);
      expect(res.status).toBe(200);
      expect(typeof res.body.value).toBe('string');
    });

    it('returns 404 for wrong session ID', async () => {
      await request(app).post('/session').send({});
      const res = await request(app).get('/session/wrong-id/title');
      expect(res.status).toBe(404);
    });
  });

  describe('closeSession()', () => {
    it('calls closeSingleSession', async () => {
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;

      await request(app).delete(`/session/${id}`);
      expect(server.closeCalls).toBe(1);
    });

    it('silently ignores unknown session IDs', async () => {
      const res = await request(app).delete('/session/nonexistent');
      expect(res.status).toBe(200);
      expect(server.closeCalls).toBe(0);
    });

    it('does not throw when closeSingleSession throws', async () => {
      server.closeSingleSession = async () => {
        throw new Error('close failed');
      };
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;

      const res = await request(app).delete(`/session/${id}`);
      expect(res.status).toBe(200);
    });
  });

  describe('idle timeout', () => {
    it('closes the session after idle timeout elapses', async () => {
      await request(app).post('/session').send({});

      // Advance time past the 10-second idle timeout.
      jest.advanceTimersByTime(10001);

      // Allow microtasks (closeSession is async) to run.
      await Promise.resolve();

      const statusRes = await request(app).get('/status');
      expect(statusRes.body.value.ready).toBe(true);
    });

    it('resets the idle timeout on navigation', async () => {
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;

      // Advance 8 seconds.
      jest.advanceTimersByTime(8000);
      await Promise.resolve();

      // Navigate to reset the timer.
      await request(app)
          .post(`/session/${id}/url`)
          .send({url: 'http://example.com'});

      // Advance another 8 seconds (total 16s, but timer was reset at 8s).
      jest.advanceTimersByTime(8000);
      await Promise.resolve();

      // Session should still be active.
      const statusRes = await request(app).get('/status');
      expect(statusRes.body.value.ready).toBe(false);
    });

    it('clears the timeout when session is explicitly closed', async () => {
      const sess = await request(app).post('/session').send({});
      const id = sess.body.value.sessionId;

      await request(app).delete(`/session/${id}`);

      // Advance time past what the timeout would have been.
      jest.advanceTimersByTime(15000);
      await Promise.resolve();

      // closeSingleSession: called once by explicit close, not by timeout.
      expect(server.closeCalls).toBe(1);
    });
  });

  describe('shutdown()', () => {
    it('closes active session and calls shutdownSingleSession', async () => {
      await request(app).post('/session').send({});

      // Fake the HTTP server so /shutdown doesn't crash.
      server.server = {close: jest.fn()};
      await request(app).get('/shutdown');

      expect(server.closeCalls).toBe(1);
      expect(server.shutdownCalls).toBe(1);
    });
  });
});
