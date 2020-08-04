# Tunneling to a Tizen Device on Another Network

If your Selenium node runs on a separate network from your Tizen device,
you may need to create a tunnel to that other network.  This document will
explain how to do that with SSH.  We assume general familiarity with SSH and
that your target network has an accessible SSH server already.

The Tizen WebDriver server uses Tizen Studio to control the device.  (See
[how-it-works.md](how-it-works.md) for details.)  This uses port 26101 of the
Tizen device.  So our tunnel will target port 26101.  Here's an example SSH
command for this tunnel:

```sh
ssh my-user@other-network-server \
    -L 0.0.0.0:26101:tizen-device-hostname-or-ip:26101
```

In this example, you would replace `other-network-server` with the SSH server on
the target network, `my-user` with your username on that server, and
`tizen-device-hostname-or-ip` with the hostname or IP address of the Tizen
device on that network.  This will allow you access the remote Tizen device on
your workstation.

NOTE: You can't use `localhost` for this if you are using Docker images (the
default), since `localhost` in context of the Docker image refers to that Docker
instance, not your workstation where the tunnel is set up.  The use of `0.0.0.0`
above puts the local end of the tunnel on all network interfaces, rather than
just on `localhost`.


## Configuring your server with a tunnel

To configure the Tizen device hostname or IP server-side (recommended), use the
following system property:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=workstation-hostname-or-ip \
  # ...
```

This will direct the Tizen WebDriver server to connect to your workstation's
port 26101, which will tunnel through the SSH connection to the remote device's
port 26101.

See also ["Setting parameters"][] in the ["Setup" doc][] of
[Generic WebDriver Server][].


## Tunneling to multiple Tizen devices using different ports

If you need to tunnel to multiple Tizen devices, you will need to use different
local ports for each tunnel.  If the Tizen devices are all on the same network,
you can still use a single SSH connection for multiple tunnels.  Here's an
example SSH command with multiple tunnels:

```sh
ssh my-user@other-network-server \
  -L 0.0.0.0:26101:tizen-A-hostname-or-ip:26101 \
  -L 0.0.0.0:26102:tizen-B-hostname-or-ip:26101 \
  -L 0.0.0.0:26103:tizen-C-hostname-or-ip:26101
```

This will open three ports on your workstation (26101, 26102, 26103), each
tunneled to port 26101 on a different device.  Then you would set up three
Selenium nodes, with each specifying the port number in the backend parameters:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=workstation-hostname-or-ip:26103 \
  # ...
```


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
["Setting parameters"]: https://github.com/google/generic-webdriver-server/blob/main/setup.md#setting-parameters
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/main/setup.md
