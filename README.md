# Generic WebDriver Server

A generic [WebDriver][] server framework and base class, implementing the subset
of the WebDriver protocol necessary for [Karma][].

 - Automate JavaScript tests on exotic devices!
 - Easily add new devices!
 - Integrate easily with [Selenium grid][]!
 - Written for NodeJS and distributed via NPM!


## Intended audience

 - Projects using something like [Karma][] for testing with a [Selenium grid][]
   - If your test runner uses [WebDriver][] to point browsers back to a URL,
     this subset of the [WebDriver][] protocol can expand your grid to new
     devices
 - Not for testing via [WebDriver][] directly
   - If you use a [WebDriver][] client directly in your tests, this probably
     won't help you
   - Does not support element interaction or script injection
   - Screenshots may be supported on certain platforms


## Basic requirements

 - [NodeJS 8+](https://nodejs.org/)
 - [Selenium 3](https://www.selenium.dev/) (included)
 - [Java](https://openjdk.java.net/) (to run Selenium)


## What devices are supported?

Out of the box, we provide backends for:
 - Chromecast (NPM package [`chromecast-webdriver-server`](https://www.npmjs.com/package/chromecast-webdriver-server))
 - ChromeOS (NPM package [`chromeos-webdriver-server`](https://www.npmjs.com/package/chromeos-webdriver-server))
 - Tizen (NPM package [`tizen-webdriver-server`](https://www.npmjs.com/package/tizen-webdriver-server))
 - Xbox One/One X/One S/Series X/Series S (NPM package [`xbox-one-webdriver-server`](https://www.npmjs.com/package/xbox-one-webdriver-server))

In addition, you'll need JAR files from the package [`generic-webdriver-server`](https://www.npmjs.com/package/generic-webdriver-server).


## Chromium-based Edge

In addition to the backends we provide, you can also use this generic backend to
support Chromium-based Edge in Selenium 3, in spite of [Selenium's recent
decision not to support it directly.](https://github.com/SeleniumHQ/selenium/issues/8237#issuecomment-629851734)
For details on setup for Chromium-based Edge, see [Edgium.md](https://github.com/google/generic-webdriver-server/blob/main/Edgium.md)


## How it works

See [how-it-works.md](https://github.com/google/generic-webdriver-server/blob/main/how-it-works.md)
for details.


## Setup

See [setup.md](https://github.com/google/generic-webdriver-server/blob/main/setup.md)
for details.


[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
[WebDriver]: https://www.w3.org/TR/webdriver2/

