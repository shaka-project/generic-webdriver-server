const yargs = require('yargs');
const {loadOnWebos, addWebosArgs} = require('./webos-utils');

yargs
    .strict()
    .usage('Usage: $0 --hostname=<HOSTNAME> --url=<URL>')
    .usage('   or: $0 --hostname=<HOSTNAME> --home')
    .option('url', {
      description: 'A URL to direct the webOS device to.\n' +
                   'Either --url or --home must be specified.',
      type: 'string',
    })
    .option('home', {
      description: 'Direct the webOS device to the home screen.\n' +
                   'Either --url or --home must be specified.',
      type: 'boolean',
    })
    // You can't use both at once.
    .conflicts('url', 'home')
    .check((flags) => {
      // Enforce that one or the other is specified.
      if (!flags.url && !flags.home) {
        throw new Error('Either --url or --home must be specified.');
      }

      return true;
    });

addWebosArgs(yargs);

const flags = yargs.argv;

loadOnWebos(flags, /* log= */ console, flags.url);
