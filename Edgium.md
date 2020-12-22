# Generic WebDriver Setup for Chromium-based Edge

In a [comment from April
2020](https://github.com/SeleniumHQ/selenium/issues/8237#issuecomment-629851734),
the Selenium maintainers said that they would not support Chromium-based Edge in
Selenium 3.  They instead suggested waiting for a stable version of Selenium 4.
However, as of December 2020, there is no release date in sight for Selenium 4,
Chromium-based Edge is the only version of Edge actively supported by Microsoft
since August 2020, and [legacy Edge will reach end-of-life status in March 2021.](https://techcommunity.microsoft.com/t5/microsoft-365-blog/microsoft-365-apps-say-farewell-to-internet-explorer-11-and/ba-p/1591666)

Thankfully, Generic WebDriver Server is generic enough to handle this case.  We
can use it to configure Selenium 3 to respond to Edge and use Microsoft's
`msedgedriver.exe` as a backend executable.

If you haven't read
[setup.md](https://github.com/google/generic-webdriver-server/blob/main/setup.md)
yet, that is where you will find general information on setting up Generic
WebDriver Server.  This document will focus on specific setup instructions for
Chromium-based Edge.

## Setup

*NOTE: Though our custom backends can be configured to respond to arbitrary
browser names, `msedgedriver.exe` responds only to the browser name `msedge` as
far as we can tell.  So it is important not to change the browser name in the
configs below to anything else!*

1. Make sure you have the correct version of `msedgedriver.exe` for your version
of Edge.  See [Microsoft's instructions to check Edge version and download
the right driver](https://docs.microsoft.com/en-us/microsoft-edge/webdriver-chromium/?tabs=javascript#install-microsoft-edge-chromium).
You should have Edge version 75 or later.


2. Install GenericWebDriverServer:

```sh
npm install -g generic-webdriver-server
```


3. Create a node config file like this one as `node_edge.json`:

```json
{
  "capabilities": [
    {
      "browserName": "msedge",
      "seleniumProtocol": "WebDriver",
      "maxInstances": 2
    }
  ],
  "host": "127.0.0.1",
  "port": 5555,
  "hub": "http://localhost:4444"
}
```

You **must** set the `browserName` field to `"msedge"` exactly.  You may
customize `maxInstances`, `host`, `port`, and `hub` to your grid setup, and you
may add additional Selenium node configurations as you see fit.


4. Create the following batch file as `start_edge_node.bat`:

```bat
set NODE_MODULES_PATH="%APPDATA%\npm\node_modules"

java ^
  -cp "%NODE_MODULES_PATH%"\generic-webdriver-server\GenericWebDriverProvider.jar;"%NODE_MODULES_PATH%"\generic-webdriver-server\selenium-server-standalone-3.141.59.jar ^
  org.openqa.grid.selenium.GridLauncherV3 ^
  -role node ^
  -nodeConfig node_edge.json
```

You may replace the jar file paths with whatever is appropriate for your system,
but this should be the right path for many installations of NPM on Windows.


5. Launch `start_edge_node.bat` to start the Selenium node for Chromium-based
Edge, or configure Windows to launch it automatically on startup.  If you have
some existing system for starting and managing your Selenium nodes, you may run
the command lines from `start_edge_node.bat` in your own way.
