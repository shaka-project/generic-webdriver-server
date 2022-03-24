// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.genericwebdriver;

import static com.google.common.base.Preconditions.checkState;

import com.google.auto.service.AutoService;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;

import org.openqa.selenium.Capabilities;
import org.openqa.selenium.Platform;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebDriverException;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.remote.server.DefaultDriverProvider;
import org.openqa.selenium.remote.service.DriverCommandExecutor;
import org.openqa.selenium.remote.service.DriverService;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * It isn't enough to set the browser name in the Selenium node config file.  If it's a browser
 * Selenium doesn't know about, it still won't work.
 *
 * This extends Selenium's DefaultDriverProvider to allow us to inform Selenium of other browsers.
 * It feeds a GenericWebDriverService to RemoteWebDriver to start one of our GenericWebDriverServer
 * backends on demand.
 *
 * The browser name and the backend executable path are set by Java system properties on the
 * Selenium command line.
 */
public class GenericWebDriverProvider extends DefaultDriverProvider {
  /** The Java system property for the browser name. */
  public static final String BROWSER_NAME_PROPERTY = "genericwebdriver.browser.name";

  /** The Java system property for the WebDriver backend executable path. */
  public static final String WEBDRIVER_BACKEND_EXE_PROPERTY = "genericwebdriver.backend.exe";

  /**
   * The Java system property prefix for WebDriver backend executable parameters.
   *
   * For example, genericwebdriver.backend.params.foo=bar will turn into --foo=bar in the WebDriver
   * backend command-line.
   */
  public static final String BROWSER_PARAMS_PROPERTY_PREFIX = "genericwebdriver.backend.params.";

  /**
   * The Java system property for the WebDriver backend URL.
   *
   * If present, the Selenium node will connect directly to this URL without starting a backend
   * server.  This is given as an alternative to having Selenium manage the server.
   */
  public static final String WEBDRIVER_BACKEND_URL_PROPERTY = "genericwebdriver.backend.url";

  private static final Logger LOG = Logger.getLogger("GenericWebDriver");

  private static String getBrowserName() {
    return System.getProperty(BROWSER_NAME_PROPERTY, "unknown");
  }

  /** Creates a new DriverProvider based on the browser name provided via system properties. */
  public GenericWebDriverProvider() {
    super(
        new DesiredCapabilities(
            getBrowserName(),
            // The browser "version", which doesn't seem to affect anything and doesn't seem to have
            // to match what's in the node's config file.
            "1",
            Platform.ANY),
        RemoteWebDriver.class);
    LOG.info("GenericWebDriverProvider initialized with browser name \"" + getBrowserName() + "\"");
  }

  /**
   * Creates a new RemoteWebDriver instance based on information provided via system properties.
   */
  @SuppressWarnings("unchecked")
  @Override
  public WebDriver newInstance(Capabilities capabilities) {
    String urlString = System.getProperty(WEBDRIVER_BACKEND_URL_PROPERTY);
    if (urlString != null) {
      URL url;
      try {
        url = new URL(urlString);
      } catch (MalformedURLException e) {
        LOG.severe("Malformed WebDriver backend URL " + urlString + ": " + e);
        return null;
      }

      // This will route WebDriver commands to the URL provided by the user.
      LOG.info("Starting RemoteWebDriver backed by URL " + url);
      return new RemoteWebDriver(url, capabilities);
    }

    // Check if there are parameters from the client.
    Object rawParams = capabilities.getCapability("generic:params");
    Map<String, String> params = (Map<String, String>) rawParams;
    if (params == null) {
      params = new HashMap<String, String>();
    }

    // Now override those with parameters from Java system properties.  Parameters set on the grid
    // take precedence over those sent by the client.
    Set<String> systemPropertyNames = System.getProperties().stringPropertyNames();
    for (String name : systemPropertyNames) {
      if (name.startsWith(BROWSER_PARAMS_PROPERTY_PREFIX)) {
        String value = System.getProperty(name);
        String paramName = name.replace(BROWSER_PARAMS_PROPERTY_PREFIX, "");
        params.put(paramName, value);
      }
    }

    // Check if there are additional arguments from the client.  These will be appended to the
    // command line after the named parameters.
    Object rawArgs = capabilities.getCapability("generic:args");
    List<String> args = (List<String>) rawArgs;

    // This will start a WebDriver server with the path provided by the user, and route WebDriver
    // commands to the server's URL.  It will also manage the server's lifetime.
    GenericWebDriverService service = GenericWebDriverService.createDefaultService(params, args);
    DriverCommandExecutor executor = new DriverCommandExecutor(service);

    String exePath = System.getProperty(WEBDRIVER_BACKEND_EXE_PROPERTY);
    LOG.info(
        "Starting RemoteWebDriver backed by executable " + exePath + " at URL " + service.getUrl());
    return new RemoteWebDriver(executor, capabilities);
  }

  /**
   * An extension of DriverService for our GenericWebDriverServer backends.
   *
   * It locates the executable (based on system property) and constructs an appropriate
   * command-line.  The base class (DriverService) starts and stops the server as needed.
   * This is how Selenium is able to manage our server for us when tests need to be run.
   */
  static private class GenericWebDriverService extends DriverService {
    public GenericWebDriverService(
        File executable,
        int port,
        ImmutableList<String> args,
        ImmutableMap<String, String> environment) throws IOException {
      super(executable, port, args, environment);
    }

    public static GenericWebDriverService createDefaultService(
        Map<String, String> params,
        List<String> args) {
      return new Builder().withParams(params).withArgs(args).build();
    }

    @AutoService(DriverService.Builder.class)
    public static class Builder extends DriverService.Builder<
        GenericWebDriverService, GenericWebDriverService.Builder> {

      private Map<String, String> params = null;
      private List<String> args = null;

      /**
       * Configures command-line parameters for the driver server.
       *
       * @param params A map of parameters to be passed to the server via command-line arguments.
       * @return A self reference.
       */
      public Builder withParams(Map<String, String> params) {
        this.params = params;
        return this;
      }

      /**
       * Configures extra command-line arguments for the driver server.
       *
       * @param args A list of arguments to be passed to the server at the end of its command-line.
       * @return A self reference.
       */
      public Builder withArgs(List<String> args) {
        this.args = args;
        return this;
      }

      @Override
      public int score(Capabilities capabilites) {
        return getBrowserName().equals(capabilites.getBrowserName()) ? 1 : 0;
      }

      @Override
      protected File findDefaultExecutable() {
        String exePath = System.getProperty(WEBDRIVER_BACKEND_EXE_PROPERTY);
        checkState(exePath != null,
            "The path to the driver executable must be set by the %s system property.",
            WEBDRIVER_BACKEND_EXE_PROPERTY);

        File exe = new File(exePath);
        checkExecutable(exe);
        return exe;
      }

      @Override
      protected ImmutableList<String> createArgs() {
        ImmutableList.Builder<String> argsBuilder = ImmutableList.builder();

        argsBuilder.add(String.format("--port=%d", getPort()));

        if (getLogFile() != null) {
          argsBuilder.add(String.format("--log-path=%s", getLogFile().getAbsolutePath()));
        }

        if (params != null) {
          for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            // Some args should not be controlled by the client:
            if (key == "port" || key == "log-path" || key == "help") {
              LOG.warning("Ignoring unsupported parameter " + key);
              continue;
            }

            String value = entry.getValue();
            String arg;
            if (value != null && value != "") {
              arg = String.format("--%s=%s", key, value);
            } else {
              arg = String.format("--%s", key);
            }
            LOG.fine("Adding backend param " + key + " = " + value);
            argsBuilder.add(arg);
          }  // for (Map.Entry<String, String> entry : params.entrySet())
        }  // if (params != null)

        // Extra arguments, if specified, come after the named parameters.
        if (args != null) {
          // To prevent clients from using this to change listening ports, logging paths, or other
          // sensitive options we screen out in params above, we prepend "--".  To set flags, use
          // params instead.
          argsBuilder.add("--");
          argsBuilder.addAll(args);
        }

        return argsBuilder.build();
      }

      @Override
      protected GenericWebDriverService createDriverService(
          File exe,
          int port,
          ImmutableList<String> args,
          ImmutableMap<String, String> environment) {
        try {
          return new GenericWebDriverService(exe, port, args, environment);
        } catch (IOException e) {
          throw new WebDriverException(e);
        }
      }
    }
  }
}
