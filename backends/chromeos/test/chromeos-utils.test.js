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

jest.mock('node-fetch');
jest.mock('node-ssh');
jest.mock('fs');

const nodeFetch = require('node-fetch');
const {NodeSSH} = require('node-ssh');
const fs = require('fs');
const path = require('path');

const {
  DEFAULT_SSH_PORT,
  DESTINATION_FOLDER,
  fetchPrivateKey,
  connectAndPrepDevice,
  loadOnChromeOS,
  loadChromeOSLoginScreen,
} = require('../chromeos-utils');

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const defaultFlags = {
  hostname: '192.168.1.50',
  username: 'root',
  privateKey: '/home/user/.ssh/chromeos_testing_rsa',
  fetchPrivateKey: false,
  privateKeyUrl: 'https://example.com/key',
};

describe('fetchPrivateKey()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if the key file already exists', async () => {
    fs.existsSync.mockReturnValue(true);

    await fetchPrivateKey(defaultFlags, log);

    expect(nodeFetch).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('throws if key is missing and fetchPrivateKey is false', async () => {
    fs.existsSync.mockReturnValue(false);

    await expect(fetchPrivateKey(defaultFlags, log))
        .rejects.toThrow('Private key not found');
  });

  it('downloads and writes the key when fetchPrivateKey is true', async () => {
    fs.existsSync.mockReturnValue(false);
    nodeFetch.mockResolvedValue({text: async () => 'base64keydata=='});

    const flags = {...defaultFlags, fetchPrivateKey: true};
    await fetchPrivateKey(flags, log);

    expect(nodeFetch).toHaveBeenCalledWith(flags.privateKeyUrl);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
        flags.privateKey,
        'base64keydata==',
        'base64');
  });

  it('sets 0o600 permissions on the downloaded key', async () => {
    fs.existsSync.mockReturnValue(false);
    nodeFetch.mockResolvedValue({text: async () => 'base64data'});

    const flags = {...defaultFlags, fetchPrivateKey: true};
    await fetchPrivateKey(flags, log);

    expect(fs.chmodSync).toHaveBeenCalledWith(flags.privateKey, 0o600);
  });

  it('creates the .ssh folder if it does not exist', async () => {
    const flags = {...defaultFlags, fetchPrivateKey: true};
    fs.existsSync.mockImplementation((p) => {
      if (p === flags.privateKey) return false;          // key file absent
      if (p === path.dirname(flags.privateKey)) return false;  // folder absent
      return false;
    });
    nodeFetch.mockResolvedValue({text: async () => 'data'});

    await fetchPrivateKey(flags, log);

    expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.dirname(flags.privateKey),
        {recursive: true});
  });

  it('skips folder creation if the folder already exists', async () => {
    const flags = {...defaultFlags, fetchPrivateKey: true};
    fs.existsSync.mockImplementation((p) => {
      if (p === flags.privateKey) return false;         // key file absent
      if (p === path.dirname(flags.privateKey)) return true;  // folder present
      return false;
    });
    nodeFetch.mockResolvedValue({text: async () => 'data'});

    await fetchPrivateKey(flags, log);

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});

describe('connectAndPrepDevice()', () => {
  let mockSshInstance;

  beforeEach(() => {
    mockSshInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      exec: jest.fn().mockResolvedValue({code: 0, stdout: '', stderr: ''}),
      putFiles: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    };
    NodeSSH.mockImplementation(() => mockSshInstance);
    jest.clearAllMocks();
  });

  it('connects with the correct host and port (default port)', async () => {
    await connectAndPrepDevice(defaultFlags, log);

    expect(mockSshInstance.connect).toHaveBeenCalledWith(
        expect.objectContaining({host: '192.168.1.50', port: DEFAULT_SSH_PORT}));
  });

  it('uses explicit port when specified in hostname', async () => {
    const flags = {...defaultFlags, hostname: '192.168.1.50:2222'};
    await connectAndPrepDevice(flags, log);

    expect(mockSshInstance.connect).toHaveBeenCalledWith(
        expect.objectContaining({host: '192.168.1.50', port: 2222}));
  });

  it('uses the correct username and private key path', async () => {
    await connectAndPrepDevice(defaultFlags, log);

    expect(mockSshInstance.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'root',
          privateKeyPath: defaultFlags.privateKey,
        }));
  });

  it('creates the scripts folder on the device', async () => {
    await connectAndPrepDevice(defaultFlags, log);

    expect(mockSshInstance.exec).toHaveBeenCalledWith(
        'mkdir', ['-p', DESTINATION_FOLDER], expect.any(Object));
  });

  it('transfers all helper scripts to the device', async () => {
    await connectAndPrepDevice(defaultFlags, log);

    expect(mockSshInstance.putFiles).toHaveBeenCalled();
    const transfers = mockSshInstance.putFiles.mock.calls[0][0];
    const remoteFiles = transfers.map((t) => t.remote);

    expect(remoteFiles).toContain(`${DESTINATION_FOLDER}/launch_page.sh`);
    expect(remoteFiles).toContain(`${DESTINATION_FOLDER}/show_login_screen.sh`);
    expect(remoteFiles).toContain(
        `${DESTINATION_FOLDER}/auto_login_chrome_wrapper.sh`);
    expect(remoteFiles).toContain(`${DESTINATION_FOLDER}/shut_down_sessions.sh`);
  });

  it('makes the scripts executable on the device', async () => {
    await connectAndPrepDevice(defaultFlags, log);

    const chmodCall = mockSshInstance.exec.mock.calls.find(
        (c) => c[0] === '/bin/chmod');
    expect(chmodCall).toBeDefined();
    expect(chmodCall[1]).toContain('755');
  });

  it('returns the SSH connection on success', async () => {
    const result = await connectAndPrepDevice(defaultFlags, log);
    expect(result).toBe(mockSshInstance);
  });

  it('disposes the SSH connection and rethrows on error', async () => {
    mockSshInstance.exec.mockRejectedValue(new Error('exec failed'));

    await expect(connectAndPrepDevice(defaultFlags, log))
        .rejects.toThrow('exec failed');
    expect(mockSshInstance.dispose).toHaveBeenCalled();
  });
});

describe('loadOnChromeOS()', () => {
  let mockSsh;

  beforeEach(() => {
    mockSsh = {
      exec: jest.fn().mockResolvedValue({code: 0, stdout: '', stderr: ''}),
    };
  });

  it('runs the launch script with --kiosk and --app= for a URL', async () => {
    await loadOnChromeOS(log, mockSsh, 'http://example.com', null);

    const execArgs = mockSsh.exec.mock.calls[0][1];
    expect(execArgs).toContain('--kiosk');
    expect(execArgs.some((a) => a.startsWith('--app='))).toBe(true);
    expect(execArgs.some((a) => a.includes('http://example.com'))).toBe(true);
  });

  it('includes extra chromeArgs when provided', async () => {
    await loadOnChromeOS(log, mockSsh, 'http://example.com',
        ['--disable-gpu', '--no-sandbox']);

    const execArgs = mockSsh.exec.mock.calls[0][1];
    expect(execArgs).toContain('--disable-gpu');
    expect(execArgs).toContain('--no-sandbox');
  });

  it('runs the launch script without kiosk flags for null URL', async () => {
    await loadOnChromeOS(log, mockSsh, null, null);

    const execArgs = mockSsh.exec.mock.calls[0][1];
    expect(execArgs).not.toContain('--kiosk');
    expect(execArgs.every((a) => !a.startsWith('--app='))).toBe(true);
  });
});

describe('loadChromeOSLoginScreen()', () => {
  let mockSsh;

  beforeEach(() => {
    mockSsh = {
      exec: jest.fn().mockResolvedValue({code: 0, stdout: '', stderr: ''}),
    };
  });

  it('runs the show_login_screen.sh script', async () => {
    await loadChromeOSLoginScreen(log, mockSsh);

    expect(mockSsh.exec).toHaveBeenCalledWith(
        expect.stringContaining('show_login_screen.sh'),
        expect.any(Array),
        expect.any(Object));
  });
});
