# Chromecast WebDriver Server

A [WebDriver][] server for Chromecast, implementing the subset of the WebDriver
protocol necessary for [Karma][].  Add Chromecast to your [Selenium grid][]!

Part of the [Generic WebDriver Server][] family.


## Installation

```sh
npm install --save-dev generic-webdriver-server chromecast-webdriver-server
```


## Usage

First, please refer to the ["Setup" doc][] for [Generic WebDriver Server][].
That will explain how to set up Selenium to talk to Generic WebDriver Servers,
as well as how to set server parameters.

In the command-line for the Selenium node, set the following Java system
properties:

 - `genericwebdriver.browser.name`: We recommend the value "chromecast".  See
   also notes in the ["Setup" doc][].
 - `genericwebdriver.backend.exe`: The path to the executable, such as
   `node_modules/chromecast-webdriver-server/chromecast-webdriver-server.js`
 - `genericwebdriver.backend.params.hostname`: The hostname or IP address of the
   Chromecast device, with optional port number.  If omitted, this **must** be
   provided in the client's desired capabilities instead.  (See below.)


## Supported parameters

This backend supports the following parameters:

 - `hostname`: **(required)** The hostname or IP address of the Chromecast
   device, with optional port number.
 - `receiver-app-id`: The receiver app ID to load, in case you want to host
   your own copy.  (See also
   [receiver-deployment.md](https://github.com/shaka-project/generic-webdriver-server/blob/main/backends/chromecast/receiver-deployment.md))
 - `idle-timeout-seconds`: The timeout for idle sessions, after which they will
   be closed.
 - `connection-timeout-seconds`: The connection timeout for the Chromecast,
   after which the corresponding WebDriver operation will fail.


## Chromecast receiver deployment

Deploying your own copy of the Chromecast receiver is completely optional.
Doing so would allow you to:

  1. Make changes to the receiver app that affect your clients
  2. Not depend on github.io being up or accessible from your network

Unless you need one of these things, we recommend using the default receiver
app ID, which points to a copy served by github.io.

To learn how to deploy your own copy of the Chromecast Receiver, see
[receiver-deployment.md](https://github.com/shaka-project/generic-webdriver-server/blob/main/backends/chromecast/receiver-deployment.md)
for details.


## How it works

See [how-it-works.md](https://github.com/shaka-project/generic-webdriver-server/blob/main/backends/chromecast/how-it-works.md)
for details.


## Tunneling to a Chromecast on another network

See [tunneling.md](https://github.com/shaka-project/generic-webdriver-server/blob/main/backends/chromecast/tunneling.md)
for details.


## Using the CLI

In addition to running a Chromecast node in Selenium, this package offers a CLI
for directing a Chromecast to a specific URL.  For example, if installed
globally with `npm install -g chromecast-webdriver-server`:

```sh
chromecast-webdriver-cli --hostname=192.168.1.42 \
  --url=https://shaka-player-demo.appspot.com/demo/
```


## Access Limitations

We show an arbitrary URL on the device by embedding it into an iframe in our
Chromecast receiver app.  However, sites can prevent iframe-embedding with the
[`X-Frame-Options` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options).

Though this should not be an issue for a test runner, this may affect other
URLs.  Unfortunately, there is no way for the receiver app to detect when this
has happened.  See: https://github.com/shaka-project/generic-webdriver-server/issues/8


[Generic WebDriver Server]: https://github.com/shaka-project/generic-webdriver-server
[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
["Setup" doc]: https://github.com/shaka-project/generic-webdriver-server/blob/main/setup.md
[WebDriver]: https://www.w3.org/TR/webdriver2/
