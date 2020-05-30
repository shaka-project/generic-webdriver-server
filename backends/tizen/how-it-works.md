# How Tizen WebDriver Server Works

The Tizen WebDriver server is composed of two parts:

1. A container application (see [app-template/](app-template/))
2. [Tizen Studio][] (local copy or Docker image)


## The Container App

The Tizen WebDriver server's container app hosts an iframe which will display
any URL at the client's request.  When the client requests a URL to be loaded,
an [app template](app-template/) is built into a complete app containing the
requested URL.  The app is then installed on the Tizen device and launched.

When the WebDriver client closes the session, the Tizen WebDriver server uses
[Tizen Studio][] to uninstall the app, which also shuts it down if it's running.


## Tizen Studio

[Tizen Studio][] is required to build the container app, install it on the
device, and launch it.  If you already have Tizen Studio installed, Tizen
WebDriver server can be configured to use your local copy.  But the default is
to use a Docker image we provide, which contains Tizen Studio in a hermetic
environment.


### Docker images

We provide public Docker images containing a copy of Tizen Studio.  By default,
Tizen WebDriver Server uses the image published at
`gcr.io/generic-webdriver-server/tizen-studio-tv-3.0` to run Tizen Studio with
the TV 3.0 SDK installed, but you can configure the server to use any arbitrary
Docker image if you have your own.  See the option `tizen-studio-docker-image`.


### Custom Docker images

If you choose to use your own Docker images, you may also need to set the
options `tizen-studio-path` and `tizen-studio-author-profile` so that the
server can construct the correct commands and arguments for Tizen Studio.

The defaults for these options are set appropriately for the images we provide.
If you don't have pre-existing Docker images for Tizen Studio, but you want to
create a custom image anyway, you can base yours on ours.  We currently provide
two images:

 - `gcr.io/generic-webdriver-server/tizen-studio`: A base image with Tizen
   Studio installed on top of a minimal Ubuntu environment, with no special
   SDKs installed.
 - `gcr.io/generic-webdriver-server/tizen-studio-tv-3.0`: Built on top of the
   base image, and includes the TV 3.0 SDK.

The source for these images can be found in
[tizen-studio-docker/](tizen-studio-docker/), and you are welcome to rebuild
them locally or customize them.  We would also be happy to accept pull requests
for specialized images with other platform SDKs installed.


### Local installation

A local installation of Tizen Studio can also be used.  Set the flag
`local-tizen-studio` for this, as well as the options `tizen-studio-path` and
`tizen-studio-author-profile` so that the server can construct the correct
commands and arguments for Tizen Studio.


[Tizen Studio]: https://developer.tizen.org/development/tizen-studio/download?langswitch=en
