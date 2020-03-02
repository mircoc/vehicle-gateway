require('dotenv').config();

const {startServer} = require('./services/tcpserver');
const {getLogger} = require('./services/logger');

const logger = getLogger("TCP Server main");

(async () => {
  try {
      await startServer();
  }
  catch(error) {

    logger.error(error);
    process.exit(1);
  }
})();