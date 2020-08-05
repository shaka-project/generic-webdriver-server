# Tizen WebDriver Server

A [WebDriver][] server for Tizen devices, implementing the subset of the
WebDriver protocol necessary for [Karma][].  Add Tizen devices to your
[Selenium grid][]!

Part of the [Generic WebDriver Server][] family.


## Installation

```sh
npm install --save-dev generic-webdriver-server tizen-webdriver-server
```

Because Docker images may take significant time to download the first time they
are used by the server, you may want to pre-fetch the image you'll be using.
This command will fetch the default image:

```sh
docker pull gcr.io/generic-webdriver-server/tizen-studio-tv-3.0
```


## Usage

First, please refer to the ["Setup" doc][] for [Generic WebDriver Server][].
That will explain how to set up Selenium to talk to Generic WebDriver Servers,
as well as how to set server parameters.

In the command-line for the Selenium node, set the following Java system
properties:

 - `genericwebdriver.browser.name`: We recommend the value "tizen".  See also
   notes in the ["Setup" doc][].
 - `genericwebdriver.backend.exe`: The path to the executable, such as
   `node_modules/tizen-webdriver-server/tizen-webdriver-server.js`
 - `genericwebdriver.backend.params.hostname`: The hostname or IP address of the
   the Tizen device, with optional port number.  If omitted, this **must** be
   provided in the client's desired capabilities instead.  (See below.)


## Supported parameters

This backend supports the following parameters:

 - `hostname`: **(required)** The hostname or IP address of the Tizen device,
   with optional port number.
 - `local-tizen-studio`: If true, use a locally-installed copy of Tizen Studio
   instead of a Docker image.
 - `tizen-studio-docker-image`: The name of a Docker image to use for Tizen
   Studio.  Defaults to an image provided by us which includes the TV 3.0 SDK.
 - `tizen-studio-path`: The path to the installation of Tizen Studio, either
   locally or within a Docker image.  The default is appropriate for the Docker
   images we provide.
 - `tizen-studio-author-profile`: The name of a pre-existing author profile to
   use when signing the temporary application deployed to the Tizen device.  The
   default is appropriate for the Docker images we provide.


## How it works

See [how-it-works.md](https://github.com/google/generic-webdriver-server/blob/main/backends/tizen/how-it-works.md)
for details.


## Tunneling to a Tizen device on another network

See [tunneling.md](https://github.com/google/generic-webdriver-server/blob/main/backends/tizen/tunneling.md)
for details.


## Tizen Studio Docker Images

We provide public Docker images for Tizen Studio which are used by default.
Downloading or building these locally will use about 3.2GB of disk space (as of
July 2020).

To learn more about the Docker images, see
[how-it-works.md](https://github.com/google/generic-webdriver-server/blob/main/backends/tizen/how-it-works.md)
and the
[tizen-studio-docker/](https://github.com/google/generic-webdriver-server/blob/main/backends/tizen/tizen-studio-docker/)
folder.


## Using the CLI

In addition to running a Tizen node in Selenium, this package offers a CLI for
directing a Tizen device to a specific URL.  For example, if installed globally
with `npm install -g tizen-webdriver-server`:

```sh
tizen-webdriver-cli --hostname=192.168.1.42 --url=https://www.google.com/
```


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/main/setup.md
[WebDriver]: https://www.w3.org/TR/webdriver2/
