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

// Mock castv2 before any require so the module gets the mock.
jest.mock('castv2');

const castv2 = require('castv2');
const {cast, Mode} = require('../cast-utils');

// Silence log output during tests.
const log = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const defaultFlags = {
  hostname: '192.168.1.100',
  receiverAppId: '29993EC8',
  redirect: false,
  connectionTimeoutSeconds: 30,
};

// The home screen app ID hard-coded in cast-utils.js.
const HOME_SCREEN_APP_ID = 'E8C28D3C';

describe('cast()', () => {
  let mockClient;
  let mockChannel;
  let messageHandler;
  let errorHandler;

  beforeEach(() => {
    jest.useFakeTimers();
    messageHandler = null;
    errorHandler = null;

    mockChannel = {
      send: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'message') messageHandler = handler;
      }),
    };

    mockClient = {
      on: jest.fn((event, handler) => {
        if (event === 'error') errorHandler = handler;
      }),
      connect: jest.fn((options, cb) => cb()),
      createChannel: jest.fn(() => mockChannel),
      close: jest.fn(),
    };

    castv2.Client = jest.fn(() => mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('hostname parsing', () => {
    it('uses port 8009 when no port is specified in hostname', () => {
      cast(defaultFlags, log, Mode.HOME, null);
      expect(mockClient.connect).toHaveBeenCalledWith(
          {host: '192.168.1.100', port: 8009},
          expect.any(Function));
    });

    it('uses the explicit port when specified in hostname', () => {
      const flags = {...defaultFlags, hostname: '192.168.1.100:9000'};
      cast(flags, log, Mode.HOME, null);
      expect(mockClient.connect).toHaveBeenCalledWith(
          {host: '192.168.1.100', port: 9000},
          expect.any(Function));
    });
  });

  describe('Mode.URL', () => {
    it('sends a LAUNCH request with the receiver app ID', () => {
      cast(defaultFlags, log, Mode.URL, 'http://example.com');

      // receiver.send is the second send call (after connection.send).
      const sendCalls = mockChannel.send.mock.calls;
      const launchRequest = sendCalls.find((c) => c[0].type === 'LAUNCH');
      expect(launchRequest).toBeDefined();
      expect(launchRequest[0].appId).toBe('29993EC8');
    });

    it('includes the URL in commandParameters', () => {
      cast(defaultFlags, log, Mode.URL, 'http://example.com');

      const sendCalls = mockChannel.send.mock.calls;
      const launchRequest = sendCalls.find((c) => c[0].type === 'LAUNCH');
      const params = JSON.parse(launchRequest[0].commandParameters);
      expect(params.url).toBe('http://example.com');
    });

    it('resolves when the target app appears in RECEIVER_STATUS', async () => {
      const castPromise =
          cast(defaultFlags, log, Mode.URL, 'http://example.com');

      messageHandler({
        type: 'RECEIVER_STATUS',
        status: {applications: [{appId: '29993EC8'}]},
      });

      await expect(castPromise).resolves.toBeUndefined();
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('does not resolve when a different app is running', async () => {
      const castPromise =
          cast(defaultFlags, log, Mode.URL, 'http://example.com');

      // Different app ID - should not trigger resolution.
      messageHandler({
        type: 'RECEIVER_STATUS',
        status: {applications: [{appId: 'SOMEOTHERAPP'}]},
      });

      // Advance time to trigger timeout so the promise can settle.
      jest.advanceTimersByTime(31000);

      await expect(castPromise).rejects.toThrow('Timeout');
    });

    it('sets redirect flag in commandParameters', () => {
      const flags = {...defaultFlags, redirect: true};
      cast(flags, log, Mode.URL, 'http://example.com');

      const sendCalls = mockChannel.send.mock.calls;
      const launchRequest = sendCalls.find((c) => c[0].type === 'LAUNCH');
      const params = JSON.parse(launchRequest[0].commandParameters);
      expect(params.redirect).toBe(true);
    });
  });

  describe('Mode.HOME', () => {
    it('sends a STOP request', () => {
      cast(defaultFlags, log, Mode.HOME, null);

      const sendCalls = mockChannel.send.mock.calls;
      const stopRequest = sendCalls.find((c) => c[0].type === 'STOP');
      expect(stopRequest).toBeDefined();
    });

    it('resolves when home screen app appears in RECEIVER_STATUS', async () => {
      const castPromise = cast(defaultFlags, log, Mode.HOME, null);

      messageHandler({
        type: 'RECEIVER_STATUS',
        status: {applications: [{appId: HOME_SCREEN_APP_ID}]},
      });

      await expect(castPromise).resolves.toBeUndefined();
    });

    it('resolves when application list is empty (Pixel tablet)', async () => {
      const castPromise = cast(defaultFlags, log, Mode.HOME, null);

      messageHandler({
        type: 'RECEIVER_STATUS',
        status: {applications: []},
      });

      await expect(castPromise).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('rejects on LAUNCH_ERROR message', async () => {
      const castPromise = cast(defaultFlags, log, Mode.URL, 'http://example.com');

      messageHandler({type: 'LAUNCH_ERROR', reason: 'Not authorized'});

      await expect(castPromise).rejects.toThrow('Failed to launch receiver');
    });

    it('rejects on client connection error', async () => {
      const castPromise = cast(defaultFlags, log, Mode.URL, 'http://example.com');

      errorHandler(new Error('Connection refused'));

      await expect(castPromise).rejects.toThrow('Connection refused');
    });

    it('rejects with timeout error when no response arrives', async () => {
      const castPromise = cast(defaultFlags, log, Mode.URL, 'http://example.com');

      jest.advanceTimersByTime(30001);

      await expect(castPromise).rejects.toThrow(
          'Timeout waiting for Chromecast to load!');
    });
  });

  describe('virtual connection setup', () => {
    it('sends a CONNECT message on the connection channel', () => {
      cast(defaultFlags, log, Mode.HOME, null);

      const connectMsg = mockChannel.send.mock.calls.find(
          (c) => c[0].type === 'CONNECT');
      expect(connectMsg).toBeDefined();
    });

    it('creates two channels (connection and receiver)', () => {
      cast(defaultFlags, log, Mode.HOME, null);
      expect(mockClient.createChannel).toHaveBeenCalledTimes(2);
    });
  });
});
