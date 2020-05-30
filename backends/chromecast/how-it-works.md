# How Chromecast WebDriver Server Works

The Chromecast WebDriver server is composed of two parts:

1. A Chromecast receiver application (see [receiver.html](receiver.html))
2. A Cast v2 protocol client written in NodeJS ([castv2][])


## The Chromecast receiver

Every Chromecast app is composed of a sender and a receiver.  The sender is part
of the web app, Android app, or iOS app, and when it begins casting, it launches
a receiver app on the Chromecast device.

Receiver apps are really just web pages, and everything on the screen is
implemented in HTML, CSS, and JavaScript.

The Chromecast WebDriver server's receiver app hosts an iframe which can be
redirected to any URL at the client's request.  This is how we load the
arbitrary URL requested by a test runner like [Karma][] without changing the
receiver app's registered URL.


## The Chromecast v2 client

The Chromecast WebDriver server uses the [castv2][] module to send commands to
the Chromecast device using the Cast v2 protocol.  When the WebDriver client
asks for a certain URL to be loaded, the server uses Cast v2 to start the
receiver app and send the desired URL in a message.  The receiver app handles
that message and loads the desired URL into its `<iframe>` element.

When the WebDriver client closes the session, the Chromecast WebDriver server
uses Cast v2 to open the Chromecast home screen "app", which closes our own
receiver app.


## Feature policy

The `<iframe>` element is normally restricted from using certain sensitive
features of the browser, to prevent embedded third-party content from abusing
the security or privacy of the hosting app or user.

But some of these features may be interesting to you in testing, so our receiver
app explicitly allows most features.  For a full list, refer to the variable
`allowedFeatures` in [receiver.html](receiver.html).

Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Feature_Policy


## Chromecast receiver deployment

To learn how to deploy your own copy of the Chromecast Receiver, see
[receiver-deployment.md](receiver-deployment.md) for details.


[castv2]: https://www.npmjs.com/package/castv2
[Karma]: https://karma-runner.github.io/
