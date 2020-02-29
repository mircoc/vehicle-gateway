const net = require('net');

const {getLogger} = require('./logger');

const logger = getLogger("TCP Server");

/**
 * startServer
 * 
 * @param {Object} options - startServe options as Object
 * @param {Number} options.port - port number to bind to
 * @param {String} options.host - host string to bind to
 * @param {Function} options.onConnection - callback called with socket on new connection
 * 
 * @returns {net.Server} started server already listening
 */
function startServer(options = {}) {
  const {
    port=4321,
    host='localhost',
    onConnection=()=>{}
  } = options;

  const server = net.createServer((c) => {
    // 'connection' listener.
    logger.info('client connected');
    c.on('end', () => {
      logger.info('client disconnected');
    });
    // c.write('hello\r\n');
    // c.pipe(c);
    onConnection(c);
  });

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

  return server;
}

module.exports = {
  startServer
};
