# Fake WebDriver Server

A fake [WebDriver][] server, implementing the subset of the WebDriver protocol
necessary for [Karma][].

A backend implementation for the [Generic WebDriver Server][] family.  Does not
actually do anything, but serves as an example and tool for testing Selenium
integration in general.


## Installation

```sh
npm install --save-dev generic-webdriver-server fake-webdriver-server
```


## Usage

First, please refer to the ["Setup" doc][] for [Generic WebDriver Server][].
That will explain how to set up Selenium to talk to Generic WebDriver Servers,
as well as how to set server parameters.

In the command-line for the Selenium node, set the following Java system
properties:

 - `genericwebdriver.browser.name`: The name of your fake browser.  See also
   notes in the ["Setup" doc][].
 - `genericwebdriver.backend.exe`: The path to the executable, such as
   `node_modules/fake-webdriver-server/fake-webdriver-server.js`


## Supported parameters

This backend supports the following parameters:

 - `foo`: Gets added to the fake page title, just to show how to access
   parameters in a backend implementation.
 - `bar`: Does nothing at all!


## How it works

It doesn't!  If you hook this up to [Karma][], Karma will time out waiting for
the "browser" to connect back to it.


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
[Karma]: https://karma-runner.github.io/
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/main/setup.md
[WebDriver]: https://www.w3.org/TR/webdriver2/
