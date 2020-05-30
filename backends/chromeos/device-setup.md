# ChromeOS Dev Mode Setup

Before a ChromeOS device can be used with ChromeOS WebDriver Server, the device
must be in dev mode and have SSH enabled.  This doc will guide you through that
process.


## Enabling dev mode

To get root access, we first need to put the device into dev mode.  This will
only need to be done once.

Primary source:
<https://www.chromium.org/chromium-os/how-tos-and-troubleshooting/debugging-features>

  1. Put the Chromebook into recovery mode by pressing `Esc+Reload+Power`.
  2. Wait for the recovery screen, then press `Ctrl+D`.
  3. Ignore warnings about OS verification mode and press `Enter`.
  4. Wait several minutes without touching the computer.  It will reboot itself.
  5. The Chromebook will "prepare for developer mode", which will take about 30
     minutes.
  6. When the out-of-box-experience screen ("Welcome!") shows up, log in with
     any account.  Tests will be run in the context of this account.


## Enabling SSH

Primary source:
<https://www.chromium.org/chromium-os/how-tos-and-troubleshooting/install-software-on-base-images>

ChromeOS WebDriver Server needs to be able to SSH into the device.  Once SSH is
enabled, the server should be able to communicate with and control the device.

  1. Open a console by pressing `Ctrl+Alt+→` or `Ctrl+Alt+↻` (where the F2 key
     would be).
  2. Log in as `root`.  No password is needed.
  3. Remove rootfs verification by running this:

     ```sh
     /usr/share/vboot/bin/make_dev_ssd.sh --remove_rootfs_verification --partitions "2 4"
     ```
  4. Run `reboot`.
  5. Wait for the device's login screen.
  6. Open a console by pressing by pressing `Ctrl+Alt+→` or `Ctrl+Alt+↻`
     (where the F2 key would be).
  7. Log in as `root`.  No password is needed.
  8. Enable SSH by running:

     ```sh
     /usr/libexec/debugd/helpers/dev_features_ssh
     ```


## Keeping the device awake

Many, many software-based solutions were tested to keep a ChromeOS device awake
for automated testing, but there were many drawbacks and none of the software
changes the Shaka Player team tried were successful in the long term.

Ultimately, we wound up using a USB device called a ["Mouse Jiggler"][] to keep
the ChromeOS device from sleeping.  This USB device registers itself as a mouse
and moves the cursor a few pixels horizontally once per minute.  This has turned
out to be the most effective and robust solution, since it can't be disabled
accidentally by a software update.  And because it only moves the cursor a few
pixels, it does not interfere with interactive usage of the device.


## Updating ChromeOS

Updating ChromeOS may undo the "Enabling SSH" steps above, and they may need to
be repeated periodically if auto-updates are enabled on the device.


["Mouse Jiggler"]: https://www.cru-inc.com/products/wiebetech/mouse_jiggler_mj-3/
