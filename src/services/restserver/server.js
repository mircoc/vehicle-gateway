
const http = require('http');

const {appCreator} = require('./app');
const {getLogger} = require('../logger');

const logger = getLogger("REST Server");

async function startServer() {
  const port = process.env.REST_SERVER_PORT;
  if (!port) {
    throw new Error("Missing REST_SERVER_PORT env")
  }
  const app = await appCreator();

  app.set('port', port);

  const server = http.createServer(app);

  server.listen(port);
  server.on('error', (error) => {
    throw error;
  });

  server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    logger.debug('Listening on ' + bind);
  });
}

module.exports = {
  startServer
};