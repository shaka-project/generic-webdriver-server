const {
  GenericSingleSessionWebDriverServer,
  yargs,
} = require('generic-webdriver-server');

const {loadOnWebos, addWebosArgs} = require('./webos-utils');

/** WebDriver server backend for webOS */
class WebosWebDriverServer extends GenericSingleSessionWebDriverServer {
  constructor() {
    super();
  }

  /** @override */
  async navigateToSingleSession(url) {
    await loadOnWebos(this.flags, this.log, url);
  }

  /** @override */
  async closeSingleSession() {
    // Send the device back to the home screen.
    await loadOnWebos(this.flags, this.log, null);
  }
}

addWebosArgs(yargs);
const server = new WebosWebDriverServer();
server.listen();
