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
 - Chromecast (NPM package `chromecast-webdriver-server`)
 - ChromeOS (NPM package `chromeos-webdriver-server`)
 - Tizen (NPM package `tizen-webdriver-server`)

In addition, you'll need JAR files from the package `generic-webdriver-server`.


## How it works

See [how-it-works.md](how-it-works.md) for details.


## Setup

See [setup.md](setup.md) for details.


[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
[WebDriver]: https://www.w3.org/TR/webdriver2/
