const net = require('net');

const {getLogger} = require('../logger');
const app = require('./app');

const logger = getLogger("TCP Server");


/**
 * startServer
 * 
 */
function startServer() {
  const port = process.env.TCP_SERVER_PORT;
  if (!port) {
    throw new Error("Missing TCP_SERVER_PORT env")
  }
  const host = process.env.TCP_SERVER_HOST;
  if (!host) {
    throw new Error("Missing TCP_SERVER_HOST env")
  }

  const server = net.createServer(app);

  server.on('error', (err) => {
    throw err;
  });

  server.listen({
    host,
    port
  }, () => {
    const address = server.address();
    logger.debug(`server is listening at ${address.address}:${address.port} (${address.family})`);
  });

}

module.exports = {
  startServer
};
