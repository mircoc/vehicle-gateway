
const http = require('http');

const {appCreator} = require('./app');
const {getLogger} = require('../logger');

const logger = getLogger("REST Server");

async function startServer() {
  const port = process.env.REST_SERVER_PORT;
  if (!port) {
    throw new Error("Missing REST_SERVER_PORT env")
  }
  const host = process.env.REST_SERVER_HOST;
  if (!host) {
    throw new Error("Missing REST_SERVER_HOST env")
  }
  const app = await appCreator();

  app.set('port', port);

  const server = http.createServer(app);

  server.listen(port, host);
  server.on('error', (error) => {
    throw error;
  });

  server.on('listening', () => {
    const address = server.address();
    logger.debug(`server is listening at ${address.address}:${address.port} (${address.family})`);
  });
}

module.exports = {
  startServer
};