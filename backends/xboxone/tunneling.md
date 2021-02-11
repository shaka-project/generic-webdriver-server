# Tunneling to an Xbox One Device on Another Network

If your Selenium node runs on a separate network from your Xbox One device,
you may need to create a tunnel to that other network.  This document will
explain how to do that with SSH.  We assume general familiarity with SSH and
that your target network has an accessible SSH server already.

The Xbox One WebDriver server uses the Device Portal API to control the device.
(See [how-it-works.md](how-it-works.md) for details.)  This uses port 11443 of
the Xbox One device.  So our tunnel will target port 11443.  Here's an example
SSH command for this tunnel:

```sh
ssh my-user@other-network-server -L 11443:xbox-one-device-hostname-or-ip:11443
```

In this example, you would replace `other-network-server` with the SSH server on
the target network, `my-user` with your username on that server, and
`xbox-one-device-hostname-or-ip` with the hostname or IP address of the Xbox One
device on that network.  This will allow you access the remote Xbox One device
on your workstation.


## Configuring your server with a tunnel

To configure the Xbox One device hostname or IP server-side (recommended), use
the following system property:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=localhost \
  # ...
```

This will direct the Xbox One WebDriver server to connect to your workstation's
port 11443, which will tunnel through the SSH connection to the remote device's
port 11443.

See also ["Setting parameters"][] in the ["Setup" doc][] of
[Generic WebDriver Server][].


## Tunneling to multiple Xbox One devices using different ports

If you need to tunnel to multiple Xbox One devices, you will need to use
different local ports for each tunnel.  If the Xbox One devices are all on the
same network, you can still use a single SSH connection for multiple tunnels.
Here's an example SSH command with multiple tunnels:

```sh
ssh my-user@other-network-server \
  -L 11443:xbox-one-A-hostname-or-ip:11443 \
  -L 11444:xbox-one-B-hostname-or-ip:11443 \
  -L 11445:xbox-one-C-hostname-or-ip:11443
```

This will open three ports on your workstation (11443, 11444, 11445), each
tunneled to port 11443 on a different device.  Then you would set up three
Selenium nodes, with each specifying the port number in the backend parameters:

```sh
java \
  -Dgenericwebdriver.backend.params.hostname=localhost:11445 \
  # ...
```


[Generic WebDriver Server]: https://github.com/google/generic-webdriver-server
["Setting parameters"]: https://github.com/google/generic-webdriver-server/blob/main/setup.md#setting-parameters
["Setup" doc]: https://github.com/google/generic-webdriver-server/blob/main/setup.md
