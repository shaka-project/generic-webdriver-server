# Agent Orientation

## Project Overview

This is a monorepo providing a generic WebDriver server framework for exotic
devices (Chromecast, ChromeOS, Tizen, Xbox One). It allows test runners like
Karma to drive these devices through a Selenium grid.

The architecture has two layers:

- **`base/`** -- The `GenericWebDriverServer` base class implementing the W3C
  WebDriver protocol subset needed by Karma. Also provides
  `GenericSingleSessionWebDriverServer` for devices that only support one
  session at a time.
- **`backends/`** -- Platform-specific subclasses, one per device type. Each
  backend overrides a small set of methods (`navigateTo`, `closeSession`, etc.)
  and ships as its own npm package.

The `backends/fake/` package is a minimal example backend. It is private and
not published to npm.

## Attribution

Read [AGENT-ATTRIBUTION.md](AGENT-ATTRIBUTION.md) for attribution details.

## Repository Structure

```
base/                   Core WebDriver server base class and Selenium JAR
backends/
  chromecast/           Pushes URLs to Chromecast via castv2
  chromeos/             SSHes into ChromeOS devices and launches Chrome
  tizen/                Deploys apps to Tizen TVs via Tizen Studio or Docker
  xboxone/              Uses Xbox Device Portal HTTP API (Windows only)
  fake/                 Minimal example backend (private, not published)
.github/workflows/      CI: lint, test matrix, release-please, PR validation
.eslintrc.js            Root ESLint config shared by all packages
package.json            Root workspace definition and cross-package scripts
```

## Installation

This repo uses npm workspaces. A single install at the root is all that is
needed -- do not run `npm install` inside individual packages.

```sh
npm ci
```

## Lint

```sh
npm run lint
```

Runs ESLint across all packages. Zero warnings are permitted (`--max-warnings
0`). Fix automatically with `npm run lint-fix`.

## Test

```sh
npm test
```

Runs Jest across all packages. Both commands continue past individual package
failures and exit non-zero if any package failed.

## JAR Build

The `base/` package contains a Java/Ant build for the Selenium
`GenericWebDriverProvider.jar`. **Skip this unless you are working on the Java
integration or running a full Selenium node.**

```sh
cd base && npm run jar   # requires Java 11 and Ant
```

CI builds the JAR before running tests. It is not required for the Jest test
suite.

## Code Style

- **ESLint + Google style.** Run lint before committing.
- **JSDoc is required** on all classes, methods, and named functions. Arrow
  functions are exempt. Use `@return` (not `@returns`), per Google style.
- **Closure JSDoc conventions** are used (e.g. `@private {string}`).
- Test files are exempt from JSDoc requirements.

## Testing Conventions

- Each package has a `test/` directory with Jest test files.
- Tests use `jest.mock()` for all I/O (fs, child_process, SSH, HTTP, etc.).
- Mock return values based on arguments (`mockImplementation`) rather than call
  order (`mockReturnValueOnce`) wherever the argument distinguishes the case.
- Constants used in tests should be exported from their source module and
  imported in the test, rather than duplicated as magic values.
- Server classes must not auto-start on `require()`. Use the
  `require.main === module` guard and export the class for testability.
- Silence server logging in tests by replacing `server.log` with jest mocks in
  `beforeEach`.

## Platform Notes

- **Xbox One backend** is Windows-only. `checkPlatformRequirements()` throws on
  non-Windows.
- **ChromeOS backend** requires SSH access and a ChromeOS device in dev mode.
- **Tizen backend** requires either local Tizen Studio or Docker.
- CI uses `core.autocrlf = false` globally. Do not commit CRLF line endings.

## Releases and Versioning

Releases are fully automated via `release-please` based on commit messages.
**Do not manually edit version numbers or changelogs.** The PR title must follow
[Conventional Commits](https://www.conventionalcommits.org/) format
(`feat:`, `fix:`, `chore:`, etc.) -- this drives changelog generation and
semantic version bumps.
