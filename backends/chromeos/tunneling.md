# Tunneling to a ChromeOS Device on Another Network

If your Selenium node runs on a separate network from your ChromeOS device,
you may need to create a tunnel to that other network.  This document will
explain how to do that with SSH.  We assume general familiarity with SSH and
that your target network has an accessible SSH server already.

The ChromeOS WebDriver server uses SSH to control the ChromeOS device.
(See [how-it-works.md](how-it-works.md) for details.)  This uses port 22 of the
ChromeOS device by default.  So our tunnel will target port 22.  Here's an
example SSH command for this tunnel:

```sh
ssh my-user@other-network-server -L 2222:chromeos-hostname-or-ip:22
```

In this example, you would replace `other-network-server` with the SSH server on
the target network, `my-user` with your username on that server, and
`chromeos-hostname-or-ip` with the hostname or IP address of the ChromeOS
device on that network.  This will allow you access the remote ChromeOS device
on `localhost`.


## Configuring your server with a tunnel

To configure the ChromeOS hostname or IP server-side (recommended), use the
following system property:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=localhost:2222 \
  # ...
```

This will direct the ChromeOS WebDriver server to connect to localhost port
2222, which will tunnel through the SSH connection to the remote device's port
22.

See also ["Setting parameters"][] in the ["Setup" doc][] of
[Generic WebDriver Server][].


## Tunneling to multiple ChromeOS devices using different ports

If you need to tunnel to multiple ChromeOS devices, you will need to use
different ports on localhost for each tunnel.  If the ChromeOS devices are all
on the same network, you can still use a single SSH connection for multiple
tunnels.  Here's an example SSH command with multiple tunnels:

```sh
ssh my-user@other-network-server \
  -L 2222:pixelbook-hostname-or-ip:22 \
  -L 2223:galaxy-chromebook-hostname-or-ip:22 \
  -L 2224:chromebook-duet-hostname-or-ip:22
```

This will open three ports on localhost (2222, 2223, 2224), each tunneled to
port 22 on a different device.  Then you would set up three Selenium nodes,
with each specifying the port number in the backend parameters:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=localhost:2224 \
  # ...
```


[Generic WebDriver Server]: https://github.com/shaka-project/generic-webdriver-server
["Setting parameters"]: https://github.com/shaka-project/generic-webdriver-server/blob/main/setup.md#setting-parameters
["Setup" doc]: https://github.com/shaka-project/generic-webdriver-server/blob/main/setup.md
