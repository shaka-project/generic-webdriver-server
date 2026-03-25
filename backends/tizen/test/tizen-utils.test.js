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

jest.mock('child_process');
jest.mock('wol', () => ({wake: jest.fn()}));
jest.mock('tmp-promise');
jest.mock('fs');
jest.mock('os');

const childProcess = require('child_process');
const wol = require('wol');
const tmp = require('tmp-promise');
const fs = require('fs');
const os = require('os');

const {dockerImageAppTemplatePath, loadOnTizen} = require('../tizen-utils');

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const localFlags = {
  hostname: '192.168.1.200',
  tizenStudioPath: '/tizen-studio',
  tizenStudioAuthorProfile: 'author',
  tizenStudioDockerImage: 'ghcr.io/shaka-project/tizen-studio-tv-3.0:2.0.0',
  localTizenStudio: true,
  wakeOnLanAddress: null,
};

const dockerFlags = {
  ...localFlags,
  localTizenStudio: false,
};

describe('loadOnTizen()', () => {
  beforeEach(() => {
    // Make execFile succeed by default (promisify adds callback as last arg).
    childProcess.execFile.mockImplementation((file, args, cb) => {
      // util.promisify adds callback as last arg.
      cb(null, '', '');
    });

    // Default: non-Darwin so no tmpdir override.
    os.type.mockReturnValue('Linux');

    // Mock tmp.dir for docker mode.
    tmp.dir.mockResolvedValue({
      path: '/tmp/tizen-webdriver-server-XXXXXX',
      cleanup: jest.fn(),
    });

    // Mock fs for docker mode file copying.
    fs.readdirSync.mockReturnValue(['index.html', 'config.xml']);
    fs.copyFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Wake-on-LAN', () => {
    it('sends WoL packet when wakeOnLanAddress is set', async () => {
      const flags = {...localFlags, wakeOnLanAddress: 'AA:BB:CC:DD:EE:FF'};
      await loadOnTizen(flags, log, 'http://example.com');
      expect(wol.wake).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('does not send WoL packet when wakeOnLanAddress is absent', async () => {
      await loadOnTizen(localFlags, log, 'http://example.com');
      expect(wol.wake).not.toHaveBeenCalled();
    });
  });

  describe('local Tizen Studio mode', () => {
    it('runs bash with the composed command', async () => {
      await loadOnTizen(localFlags, log, 'http://example.com');

      expect(childProcess.execFile).toHaveBeenCalledWith(
          'bash',
          ['-c', expect.any(String)],
          expect.any(Function));
    });

    it('includes sdb connect in the command', async () => {
      await loadOnTizen(localFlags, log, 'http://example.com');

      const cmd = childProcess.execFile.mock.calls[0][1][1];
      expect(cmd).toContain('sdb connect');
      expect(cmd).toContain(localFlags.hostname);
    });

    it('includes sdb uninstall in the command', async () => {
      await loadOnTizen(localFlags, log, 'http://example.com');

      const cmd = childProcess.execFile.mock.calls[0][1][1];
      expect(cmd).toContain('uninstall');
    });

    it('includes the URL in the command when navigating', async () => {
      await loadOnTizen(localFlags, log, 'http://example.com/page');

      const cmd = childProcess.execFile.mock.calls[0][1][1];
      expect(cmd).toContain('http://example.com/page');
    });

    it('does not include the URL when going home (null url)', async () => {
      await loadOnTizen(localFlags, log, null);

      const cmd = childProcess.execFile.mock.calls[0][1][1];
      expect(cmd).not.toContain('http');
      expect(cmd).not.toContain('sed');
    });

    it('does not include install/run commands when going home', async () => {
      await loadOnTizen(localFlags, log, null);

      const cmd = childProcess.execFile.mock.calls[0][1][1];
      expect(cmd).not.toContain(' install ');
      expect(cmd).not.toContain(' run ');
    });

    it('escapes single quotes in URLs', async () => {
      // A URL with a single quote (unusual but must be safe).
      const url = 'http://example.com/?q=it\'s';
      await loadOnTizen(localFlags, log, url);

      const cmd = childProcess.execFile.mock.calls[0][1][1];
      // The original quote should not appear literally inside single quotes.
      // The escaping strategy is: ' -> '"'"'
      expect(cmd).toContain(`'"'"'`);
    });

    it('does not run docker when localTizenStudio is true', async () => {
      await loadOnTizen(localFlags, log, 'http://example.com');

      const execCalls = childProcess.execFile.mock.calls;
      const dockerCalls = execCalls.filter((c) => c[0] === 'docker');
      expect(dockerCalls).toHaveLength(0);
    });
  });

  describe('Docker mode', () => {
    it('runs docker with the composed command', async () => {
      await loadOnTizen(dockerFlags, log, 'http://example.com');

      const execCalls = childProcess.execFile.mock.calls;
      const dockerCall = execCalls.find((c) => c[0] === 'docker');
      expect(dockerCall).toBeDefined();
    });

    it('uses the configured docker image', async () => {
      await loadOnTizen(dockerFlags, log, 'http://example.com');

      const execCalls = childProcess.execFile.mock.calls;
      const dockerCall = execCalls.find((c) => c[0] === 'docker');
      const dockerArgs = dockerCall[1];
      expect(dockerArgs).toContain(
          'ghcr.io/shaka-project/tizen-studio-tv-3.0:2.0.0');
    });

    it('mounts the app template as a volume', async () => {
      await loadOnTizen(dockerFlags, log, 'http://example.com');

      const execCalls = childProcess.execFile.mock.calls;
      const dockerCall = execCalls.find((c) => c[0] === 'docker');
      const dockerArgs = dockerCall[1];
      const volumeIndex = dockerArgs.indexOf('-v');
      expect(volumeIndex).toBeGreaterThan(-1);
      // The volume mount should include /tmp/app-template as the target.
      expect(dockerArgs[volumeIndex + 1]).toContain(dockerImageAppTemplatePath);
    });

    it('removes the container after exit (--rm flag)', async () => {
      await loadOnTizen(dockerFlags, log, 'http://example.com');

      const execCalls = childProcess.execFile.mock.calls;
      const dockerCall = execCalls.find((c) => c[0] === 'docker');
      expect(dockerCall[1]).toContain('--rm');
    });

    it('copies app template files to the temp directory', async () => {
      await loadOnTizen(dockerFlags, log, 'http://example.com');

      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it('cleans up the temp directory after execution', async () => {
      const mockCleanup = jest.fn();
      tmp.dir.mockResolvedValue({
        path: '/tmp/tizen-webdriver-server-XXXXXX',
        cleanup: mockCleanup,
      });

      await loadOnTizen(dockerFlags, log, 'http://example.com');

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('cleans up temp dir even when docker fails', async () => {
      const mockCleanup = jest.fn();
      tmp.dir.mockResolvedValue({
        path: '/tmp/tizen-webdriver-server-XXXXXX',
        cleanup: mockCleanup,
      });

      childProcess.execFile.mockImplementation((file, args, cb) => {
        if (file === 'docker') {
          cb(new Error('docker failed'));
        } else {
          cb(null, '', '');
        }
      });

      await expect(loadOnTizen(dockerFlags, log, 'http://example.com'))
          .rejects.toThrow('docker failed');
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('sets tmpdir to /tmp on macOS', async () => {
      os.type.mockReturnValue('Darwin');

      await loadOnTizen(dockerFlags, log, 'http://example.com');

      expect(tmp.dir).toHaveBeenCalledWith(
          expect.objectContaining({tmpdir: '/tmp'}));
    });

    it('does not set tmpdir on Linux', async () => {
      os.type.mockReturnValue('Linux');

      await loadOnTizen(dockerFlags, log, 'http://example.com');

      const opts = tmp.dir.mock.calls[0][0];
      expect(opts.tmpdir).toBeUndefined();
    });
  });
});
