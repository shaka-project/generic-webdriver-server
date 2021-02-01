# How Xbox One WebDriver Server Works

The Xbox One WebDriver server is composed of two parts:

1. A UWP (Universal Windows Platform) container application (see
   [app-template/](app-template/))
2. [Visual Studio][] (local copy required)


## The Container App

The Xbox One WebDriver server's container app hosts a WebView which will display
any URL at the client's request.  When the client requests a URL to be loaded,
an [app template](app-template/) is built into a complete app containing the
requested URL.  The app is then installed on the Xbox One device and launched.

When the WebDriver client closes the session, the Xbox One WebDriver server
shuts down and uninstalls the app.


## Visual Studio

[Visual Studio][] is required to build the container app.  You must also have
the [Windows 10 SDK with Universal Windows App Development Tools][] installed.
Because of these requirements, the Xbox One WebDriver Server and CLI will only
work on Windows 10.


## Device Portal APIs

The Xbox One WebDriver server uses the [Windows Device Portal REST API][] and
extensions from the [Xbox Device Portal REST API][] to install the container
app, launch it, stop it, uninstall it, and take screenshots.

Using the Device Portal APIs on an Xbox One requires you to first place the
device in [dev mode][].  (If dev mode setup fails, you can try an [alternate
method for dev mode setup][] using a secret menu and button sequence instead.)

These APIs also generally requires authentication, so you are required
to [configure the Xbox One for remote access][].


# Screenshots

Screenshots can be taken using the Device Portal API without any dependency on
Visual Studio or the container application.  So this can be done from the Xbox
One WebDriver CLI on any operating system.  This is the only platform-agnostic
function available.


[Visual Studio]: https://visualstudio.microsoft.com/
[Windows 10 SDK with Universal Windows App Development Tools]: https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/development-environment-setup
[Windows Device Portal REST API]: https://docs.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core
[Xbox Device Portal REST API]: https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/reference
[dev mode]: https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/devkit-activation
[alternate method for dev mode setup]: https://docs.microsoft.com/en-us/answers/questions/81169/almost-there-trying-activate-dev-console.html
[configure the Xbox One for remote access]: https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/device-portal-xbox
