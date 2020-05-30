# ChromeOS WebDriver Server

A [WebDriver][] server for ChromeOS, implementing the subset of the WebDriver
protocol necessary for [Karma][].  Add ChromeOS to your [Selenium grid][]!

Part of the [Generic WebDriver Server][] family.


## Installation

```sh
npm install --save-dev generic-webdriver-server chromeos-webdriver-server
```


## Usage

First, please refer to the ["Setup" doc][] for [Generic WebDriver Server][].
That will explain how to set up Selenium to talk to Generic WebDriver Servers,
as well as how to set server parameters.

In the command-line for the Selenium node, set the following Java system
properties:

 - `genericwebdriver.browser.name`: We recommend the value "chromeos".  See
   also notes in the ["Setup" doc][].
 - `genericwebdriver.backend.exe`: The path to the executable, such as
   `node_modules/chromeos-webdriver-server/chromeos-webdriver-server.js`
 - `genericwebdriver.backend.params.hostname`: The hostname or IP address of the
   ChromeOS device, with optional SSH port number.  If omitted, this **must** be
   provided in the client's desired capabilities instead.  (See below.)


## Supported parameters

This backend supports the following parameters:

 - `hostname`: **(required)** The hostname or IP address of the ChromeOS
   device, with optional SSH port number.
 - `username`: The username to use when logging in via SSH (defaults to `root`).
 - `private-key`: The path to the private key to use when logging in via SSH
   (defaults to `~/.ssh/chromeos_testing_rsa`).
 - `fetch-private-key`: If true, fetch the SSH private key if it doesn't exist
   at the path specified by `private-key` (defaults to true).
 - `private-key-url`: The URL from which to fetch a base64-encoded private key
   (defaults to the source code URL of the private key used by default in all
   dev-mode ChromeOS devices).


## Sending command-line arguments to Chrome

In addition to the parameters above, this server supports passing on extra
command line arguments to Chrome.  On the server command line, these are placed
at the end of the command and are separated from server parameters by "--".

These Chrome arguments can be set in the client's desired capabilities under
`generic:args`.  For example:

```py
caps = {
  'browserName': 'chromeos',
  'version': 'Pixelbook',
  'generic:args': [
    # Appended to the server command after "--", then passed on to the Chrome
    # instance instead of being handled by the server.
    '--autoplay-policy=no-user-gesture-required',
  ],
}
```

See also related notes in the ["Setup" doc][].


## Device setup

See [device-setup.md](device-setup.md) for details on setting up a ChromeOS
device in dev mode and enabling SSH access.


## How it works

See [how-it-works.md](how-it-works.md) for details.


## Tunneling to a ChromeOS device on another network

See [tunneling.md](tunneling.md) for details.


## Using the CLI

In addition to running a ChromeOS node in Selenium, this package offers a CLI
for directing a ChromeOS device to a specific URL.  For example, if installed
globally with `npm install -g chromeos-webdriver-server`:

```sh
chromeos-webdriver-cli --hostname=192.168.1.42 --url=https://www.google.com/
```


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/master/setup.md
[WebDriver]: https://www.w3.org/TR/webdriver2/
