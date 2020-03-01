require('dotenv').config();

const {startServer} = require('./services/restserver');
const {getLogger} = require('./services/logger');

const logger = getLogger("REST Server main");

(async () => {
  try {
      await startServer();
  }
  catch(error) {

    logger.error(error);
    process.exit(1);
  }
})();