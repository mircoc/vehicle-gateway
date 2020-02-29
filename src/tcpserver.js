require('dotenv').config();

const {startServer} = require('./services/tcpserver');
const {getLogger} = require('./services/logger');
const {getRedis} = require('./services/redis');

const logger = getLogger("TCP Server main");
const redis = getRedis();

function onConnection(socket) {
  socket.write('hello\r\n');
  // test redis
  redis.incr('connections');
  socket.pipe(socket);
}

const server = startServer({
  port: 1234,
  host: '127.0.0.1',
  onConnection
});

// setTimeout(()=>{
//   logger.info("Closing server after 12s")
//   server.close();
// }, 12000);

