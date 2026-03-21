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

const {
  SessionNotCreatedError,
  UnknownCommandError,
  InvalidArgumentError,
  InvalidSessionIdError,
  UnknownError,
} = require('../generic-webdriver-server');

describe('Response classes', () => {
  describe('SessionNotCreatedError', () => {
    it('has the correct error string', () => {
      const r = new SessionNotCreatedError();
      expect(r.value.error).toBe('session not created');
    });

    it('has HTTP status 500', () => {
      expect(new SessionNotCreatedError().httpStatusCode).toBe(500);
    });
  });

  describe('UnknownCommandError', () => {
    it('has the correct error string', () => {
      expect(new UnknownCommandError().value.error).toBe('unknown command');
    });

    it('has HTTP status 404', () => {
      expect(new UnknownCommandError().httpStatusCode).toBe(404);
    });
  });

  describe('InvalidArgumentError', () => {
    it('has the correct error string', () => {
      expect(new InvalidArgumentError().value.error).toBe('invalid argument');
    });

    it('has HTTP status 400', () => {
      expect(new InvalidArgumentError().httpStatusCode).toBe(400);
    });
  });

  describe('InvalidSessionIdError', () => {
    it('has the correct error string', () => {
      const r = new InvalidSessionIdError();
      expect(r.value.error).toBe('invalid session id');
    });

    it('has HTTP status 404', () => {
      expect(new InvalidSessionIdError().httpStatusCode).toBe(404);
    });
  });

  describe('UnknownError', () => {
    it('has the correct error string', () => {
      expect(new UnknownError().value.error).toBe('unknown error');
    });

    it('has HTTP status 500', () => {
      expect(new UnknownError().httpStatusCode).toBe(500);
    });
  });
});
