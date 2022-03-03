# Tunneling to a Chromecast on Another Network

If your Selenium node runs on a separate network from your Chromecast device,
you may need to create a tunnel to that other network.  This document will
explain how to do that with SSH.  We assume general familiarity with SSH and
that your target network has an accessible SSH server already.

The Chromecast WebDriver server uses the Cast v2 protocol to control the device.
(See [how-it-works.md](how-it-works.md) for details.)  This uses port 8009 of
the Chromecast device.  So our tunnel will target port 8009.  Here's an example
SSH command for this tunnel:

```sh
ssh my-user@other-network-server -L 8009:chromecast-hostname-or-ip:8009
```

In this example, you would replace `other-network-server` with the SSH server on
the target network, `my-user` with your username on that server, and
`chromecast-hostname-or-ip` with the hostname or IP address of the Chromecast on
that network.  This will allow you access the remote Chromecast device on
`localhost`.


## Configuring your server with a tunnel

To configure the Chromecast hostname or IP server-side (recommended), use the
following system property:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=localhost \
  # ...
```

This will direct the Chromecast WebDriver server to connect to localhost port
8009, which will tunnel through the SSH connection to the remote device's port
8009.

See also ["Setting parameters"][] in the ["Setup" doc][] of
[Generic WebDriver Server][].


## Tunneling to multiple Chromecasts using different ports

If you need to tunnel to multiple Chromecasts, you will need to use different
ports on localhost for each tunnel.  If the Chromecasts are all on the same
network, you can still use a single SSH connection for multiple tunnels.  Here's
an example SSH command with multiple tunnels:

```sh
ssh my-user@other-network-server \
  -L 8009:chromecast-v1-hostname-or-ip:8009 \
  -L 8010:chromecast-v2-hostname-or-ip:8009 \
  -L 8011:chromecast-ultra-hostname-or-ip:8009
```

This will open three ports on localhost (8009, 8010, 8011), each tunneled to
port 8009 on a different device.  Then you would set up three Selenium nodes,
with each specifying the port number in the backend parameters:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=localhost:8011 \
  # ...
```


[Generic WebDriver Server]: https://github.com/shaka-project/generic-webdriver-server
["Setting parameters"]: https://github.com/shaka-project/generic-webdriver-server/blob/main/setup.md#setting-parameters
["Setup" doc]: https://github.com/shaka-project/generic-webdriver-server/blob/main/setup.md
