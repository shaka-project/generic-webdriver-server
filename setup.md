# Generic WebDriver Server Setup

Instead of running `java -jar` directly on the Selenium standalone server, you
need to load our `GenericWebDriverProvider.jar` along with Selenium.  (This
module also includes a copy of the supported Selenium version for your
convenience.)

For example, instead of this:

```sh
java \
  -jar selenium-server-standalone-3.141.59.jar \
  -role node \
  -nodeConfig foo.json
```

Do this:

```sh
java \
  -cp node_modules/generic-webdriver-server/GenericWebDriverProvider.jar:node_modules/generic-webdriver-server/selenium-server-standalone-3.141.59.jar \
  org.openqa.grid.selenium.GridLauncherV3 \
  -role node \
  -nodeConfig foo.json
```

In this example, `-cp` specifies the class path, which includes both standard
Selenium and our special provider.  `org.openqa.grid.selenium.GridLauncherV3` is
the name of the application entry point for Selenium, which we would not have to
specify when running the typical `java -jar selenium-server-...` command for
Selenium, but it required when using `-cp`.

You also need to configure `GenericWebDriverProvider.jar` with Java system
properties so it knows which backend to start.  This is done with `-D` arguments
before the class path and entry point.  For example:

```sh
java \
  -Dgenericwebdriver.browser.name=chromecast \
  -Dgenericwebdriver.backend.exe=node_modules/chromecast-webdriver-server/chromecast-webdriver-server.js \
  -cp node_modules/generic-webdriver-server/GenericWebDriverProvider.jar:node_modules/generic-webdriver-server/selenium-server-standalone-3.141.59.jar \
  org.openqa.grid.selenium.GridLauncherV3 \
  -role node \
  -nodeConfig node_chromecast.json
```

These are the supported properties:

 - `genericwebdriver.browser.name`: **(required)** The browser's name, which
   **must** match the `browserName` field of the node config file.
 - `genericwebdriver.backend.exe`: **(required)** The path to the WebDriver
   backend executable that will be started by Selenium.
 - `genericwebdriver.backend.params.*`: Allows the specification of additional
   parameters to the backend executable.  Supported parameters will be
   documented by each backend module.


## Selenium node config

Here's an example node config file which matches the Selenium command-line
examples above.  The `browserName` field **must** match the
`genericwebdriver.browser.name` property.

```json
{
  "capabilities": [
    {
      "browserName": "chromecast",
      "version": "Ultra",
      "seleniumProtocol": "WebDriver"
    }
  ],
  "maxSession": 1,
  "host": "127.0.0.1",
  "port": 5555,
  "hub": "http://localhost:4444"
}
```


## Backend parameters

Some backends have additional command-line parameters which can be set, some of
which may be required by a given backend.  For example, the Chromecast backend
requires the IP or hostname of the Chromecast device it controls.  Refer to the
documentation for specific backends for details.


## Setting parameters

Parameters may be set server-side through Java system properties or client-side
through desired capabilities.  A client-side parameter will be ignored if the
same parameter was set server-side.

Server-side parameters can be set on the command-line for the Selenium node
using `-D` before the class path and entry point.  For example:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=192.168.1.9 \
  # ...
```

Client-side parameters can be set in the desired capabilities under
`generic:params`.  For example:

```py
caps = {
  'browserName': 'chromecast',
  'version': 'Ultra',
  'generic:params': {
    'hostname': '192.168.1.9',
  },
}
```

If the server accepts additional arguments beyond named flags, these can be set
in the desired capabilities under `generic:args`.  These will be appended to
the server command line after the named parameters and the string `--`.  This
prevents the client from accessing arbitrary flags that may be set already on
the server side.

For example:

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
