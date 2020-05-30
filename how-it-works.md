# How Generic WebDriver Server Works

Test runners like [Karma][] work by running a web server that serves JS code and
tests.  Then Karma launches a browser with a URL that points back to the Karma
web server.  The browser runs the tests and reports the results back to Karma.

For Karma or any similar URL-based test runner, Generic WebDriver Servers can
expand your [Selenium grid][] to new devices that Selenium doesn't know about.

Each server is composed of a generic base class, which provides the "frontend",
and a platform-specific subclass which provides the "backend".  The frontend
handles the [WebDriver][] protocol details, and the backend handles the
platform-specific override of certain simple methods.

For a very simple example of a complete backend implementation, see
`backends/fake/`.  You can also browse the other `backends/` in the repo.


## Integrating with Selenium

We build a JAR called `GenericWebDriverProvider.jar` which overrides Selenium's
`org.openqa.selenium.remote.server.DriverProvider` service with our own class.
This allows us to hook into a standalone Selenium node and provide a way to
launch a browser type which is not already known to Selenium.

`GenericWebDriverProvider.jar` should be used in a node with only one browser.
If you run multiple instances of this project for different device types, each
will need its own Selenium node, even if they are on the same machine.  If you
run standard Selenium-supported browsers, they must be in a separate node from
`GenericWebDriverProvider.jar`.

Your Selenium node config file specifies a `browserName` field which is
registered to the Selenium hub.  This allows the hub to route connections to the
correct node.  Then `GenericWebDriverProvider.jar` will invoke the correct
backend [WebDriver][] server.  The JAR does not have access to the node config
file, so it must be configured with the same browser name as appears in your
config file.


## Writing a new backend

A new backend is just a subclass of `GenericWebDriverServer`, which is exported
by the node module `generic-webdriver-server`.  The base class handles all the
details of the [WebDriver][] protocol, which is implemented with [Express][].
The backend subclasses override a few methods to provide device-specific
functionality, such as loading a URL or taking a screenshot.

Backends that only support one session at a time can be implemented even more
simply by extending `GenericSingleSessionWebDriverServer`.  There are fewer
methods to implement, and all the details of session IDs are managed for you by
the base class.

The methods in `GenericWebDriverServer` and
`GenericSingleSessionWebDriverServer` are documented in [JSDoc][] syntax, and
the ones to be overridden are clearly marked in the comments for the base class
constructor, and some are optional.

The folder `backends/fake/` shows a complete backend implementation that you can
base yours on.  You can also refer to any of the real backends in the
`backends/` folder.

You can send us a PR for new backends if you'd like to give back to the project,
or you can release your own modules that depend on this one.


## Big thanks

None of this would have been possible without the incredibly helpful information
provided by [@RationaleEmotions](https://github.com/RationaleEmotions) in their
Selenium grid docs, especially ["Adding Grid support for your new WebDriver
implementation"](https://rationaleemotions.github.io/gridopadesham/SUPPORT_NEW_WEBDRIVER.html).


[Express]: https://expressjs.com/
[JSDoc]: https://jsdoc.app/
[Karma]: https://karma-runner.github.io/
[Selenium grid]: https://www.selenium.dev/documentation/en/grid/
[WebDriver]: https://www.w3.org/TR/webdriver2/
