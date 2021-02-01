# Xbox One WebDriver Server

A [WebDriver][] server for Xbox One devices, implementing the subset of the
WebDriver protocol necessary for [Karma][].  Add Xbox One devices to your
[Selenium grid][]!

Part of the [Generic WebDriver Server][] family.


## Prerequisites

To use these tools, you will need:
 - Xbox One device in Dev Mode
 - Windows 10 host
 - Visual Studio 2015 Update 3, Visual Studio 2017, or Visual Studio 2019
 - Windows 10 SDK w/ Universal Windows App Development Tools (UWP)


### Dev Mode Setup

1. To put your Xbox One device in Dev Mode, start with
   [Microsoft's official docs on dev mode][].

   However, if you find that the official setup never completes, you can try
   the [alternate method for dev mode setup][] using a secret menu and button
   sequence instead:

   `Settings > System > Console Info > Press LB RB LT RT > Developer Settings >
   Developer Mode`

2. Configure the device for remote access and set a username and password.

   1. From dev home, click `Remote Access Settings`.
   2. Check `Enable Xbox Device Portal`.
   3. Check `Require authentication to remotely access this console`.
   4. Click `Set username and password`.
   5. Set a username and password, which the WebDriver server will use to
      authenticate.

3. Create a new test account or sign in with an existing account.  Without an
   account, neither Microsoft Edge nor WebView will work for some reason.

   1. From dev home, under `Test accounts`, click `Add existing` or
      `Create new`.
   2. Follow the prompts to sign in.

[Microsoft's official docs on dev mode]: https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/devkit-activation
[alternate method for dev mode setup]: https://docs.microsoft.com/en-us/answers/questions/81169/almost-there-trying-activate-dev-console.html


### Windows 10 host setup

1. If you don't have Visual Studio 2015 Update 3, Visual Studio 2017, or Visual
   Studio 2019, install it now: https://visualstudio.microsoft.com/
2. When installing the Windows 10 SDK, check Universal Windows App Development
   Tools: https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/development-environment-setup
3. If you install Visual Studio in any unusual location, you may have to
   provide an explicit path to `MSBuild.exe` when you configure the WebDriver
   server later.


### Screenshot setup

Unlike many others, this backend **does** support screenshots.  However, you
need to configure the Xbox display settings to make sure the screenshots are
consistent and correctly-aligned.

1. From dev home, under `Settings`, click `Launch Settings`.
2. Under `General`, click `TV & display options`.
3. Under `Advanced`, click `Video fidelity & overscan`.
4. Under `Overscan border`, uncheck `Apps can add a border`.


## Installation

```sh
npm install --save-dev generic-webdriver-server xbox-one-webdriver-server
```


## Usage

First, please refer to the ["Setup" doc][] for [Generic WebDriver Server][].
That will explain how to set up Selenium to talk to Generic WebDriver Servers,
as well as how to set server parameters.

In the command-line for the Selenium node, set the following Java system
properties:

 - `genericwebdriver.browser.name`: We recommend the value "xboxone".  See also
   notes in the ["Setup" doc][].
 - `genericwebdriver.backend.exe`: The path to the executable, such as
   `node_modules/.bin/xbox-one-webdriver-server.cmd` or
   `%APPDATA%\npm\xbox-one-webdriver-server.cmd`.
 - `genericwebdriver.backend.params.hostname`: The hostname or IP address of the
   Xbox One device, with optional Device Portal port number (default 11443).  If
   omitted, this **must** be provided in the client's desired capabilities
   instead.  (See below.)
 - `genericwebdriver.backend.params.username`: The Xbox One Device Portal
   username.  If omitted, this **must** be provided in the client's desired
   capabilities instead.  (See below.)
 - `genericwebdriver.backend.params.password`: The Xbox One Device Portal
   password.  If omitted, this **must** be provided in the client's desired
   capabilities instead.  (See below.)
 - `genericwebdriver.backend.params.msbuild`: The path to `MSBuild.exe` from
   Visual Studio.  The server will attempt to locate this at typical locations
   on all drives.  If that fails, this option becomes **required**.


## Supported parameters

This backend supports the following parameters:

 - `hostname`: **(required)** The hostname or IP address of the Xbox One device,
   with optional Device Portal port number (default 11443).
 - `username`: **(required)** The Xbox One Device Portal username.
 - `password`: **(required)** The Xbox One Device Portal password.
 - `msbuild`: The path to `MSBuild.exe` from Visual Studio.  The server will
   attempt to locate this at typical locations on all drives.  If that fails,
   this option becomes **required**.


## How it works

See [how-it-works.md](https://github.com/google/generic-webdriver-server/blob/main/backends/xbox-one/how-it-works.md)
for details.


## Tunneling to a Xbox One device on another network

See [tunneling.md](https://github.com/google/generic-webdriver-server/blob/main/backends/xbox-one/tunneling.md)
for details.


## Using the CLI

In addition to running a Xbox One node in Selenium, this package offers a CLI
for directing a Xbox One device to a specific URL.  For example, if installed
globally with `npm install -g xbox-one-webdriver-server`:

```sh
xbox-one-webdriver-cli.cmd ^
  --hostname=192.168.1.42 --username=myuser --password=mypassword ^
  --url=https://shaka-player-demo.appspot.com/demo/
```


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/main/setup.md
[WebDriver]: https://www.w3.org/TR/webdriver2/
