# How ChromeOS WebDriver Server Works

The ChromeOS WebDriver server uses an SSH client written in NodeJS
([node-ssh][]) to communicate with and control the ChromeOS device.  The actions
carried out over SSH are implemented as a series of bash scripts which are
copied to the device when needed.


## Device setup

See [device-setup.md](device-setup.md) for details on setting up a ChromeOS
device in dev mode and enabling SSH access.


## Authentication

ChromeOS devices in dev mode all have the same SSH private key by default.  If
you have not modified these credentials, the default parameters for the server
should work for you.  We will fetch the default SSH private key from the web the
first time the server is started.  It will be stored in
`~/.ssh/chromeos_testing_rsa` for you.

If you have customized the SSH login credentials (which would be critical for
security on an open network), you have several options:

1. Store your private key in `~/.ssh/chromeos_testing_rsa`, and the server will
   not overwrite it.
2. Store your private key in any path of your choosing, and specify it with the
   `private-key` parameter.
3. Host your private key, encoded in base64, at any URL accessible to the
   server, and specify this URL with the `private-key-url` parameter.  The
   server will download and decode the key and store it at the path specified by
   the `private-key` parameter, which defaults to `~/.ssh/chromeos_testing_rsa`.

If you are not using the `root` user to login via SSH, you can specify a
username with the `username` parameter.  Note, though, that the user must still
have the privileges necessary to carry out the actions in the bash scripts.  We
make no guarantees that you can run them as a user without root privileges.  On
Linux, though, the name "root" is not what grants root privileges, but rather
the user id `0`.  So renaming "root" on your ChromeOS device could still work.


## The bash scripts

The following scripts are copied to the ChromeOS device via SSH at the start of
each WebDriver session:

 - `auto_login_chrome_wrapper.sh`: A wrapper around the Chrome executable on
   ChromeOS that lets us bypass the login screen for automated testing.  Used by
   `launch_page.sh`.
 - `launch_page.sh`: A script to launch a URL in kiosk mode, using
   `auto_login_chrome_wrapper.sh`.  This is how we load the arbitrary URL
   requested by a test runner like [Karma][].
 - `show_login_screen.sh`: A script to show the ChromeOS login screen.  Used
   when the WebDriver session ends.
 - `shut_down_sessions.sh`: A script to shut down existing browser sessions,
   whether they were created by us or are standard login sessions.  Used by
   `launch_page.sh` and `show_login_screen.sh`.


## The auto-login wrapper

The script `auto_login_chrome_wrapper.sh` deserves some extra explanation.

When starting a new session on ChromeOS with `/sbin/session_manager`, you can
specify what Chrome executable to run, but you can't completely control the
arguments passed to it.  `session_manager` will add `--login-manager`
unconditionally as far as we know, and this causes the login screen to be
loaded.

For automated testing, we need to bypass this and log in directly as the first
user logged in on the device.  `auto_login_chrome_wrapper.sh` does this by
replacing `--login-manager` with `--login-user=$LAST_USER`, but otherwise
passing its arguments on to the real Chrome executable.

The last user is found by parsing a ChromeOS state file found in
`/home/chronos/Local State` and extracting the `LastLoggedInRegularUser` field.

When `launch_page.sh` runs `session_manager` to start a new session, it uses the
`--chrome-command` parameter to load `auto_login_chrome_wrapper.sh` in place of
Chrome.

This solution is the result of much trial and error on a dev mode ChromeOS
device.


[node-ssh]: https://www.npmjs.com/package/node-ssh
[Karma]: https://karma-runner.github.io/
