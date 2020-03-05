const axios = require('axios');

const {getLogger} = require('../logger');
const {receiveMessage, deleteMessage} = require('../messageQueue');


const logger = getLogger("WebHook Worker");

const WEBHOOK_TIMEOUT_SEC = 10;

async function worker() {

  // === information to send to webhook ===
  // - When the vehicle goes online or offline
  // - When the position changes
  // - When the battery changes
  // - When the running status changes
  // - When a debug blob is received (if you choose to implement it)

  // FIXME FIXME FIXME 
  // 
  // I need to save last position, running status and battery so
  //   i can publish update only when the value change
  // ... Maybe even before sending the message to redis queue
  // 
  // FIXME FIXME FIXME 


  const [messageId, deviceId, type, params] = await receiveMessage();
  if (messageId) {

    logger.debug(`received message for ${deviceId} type ${type}, ${JSON.stringify(params)}`);
    logger.profile(`worker_${messageId}`);

    // FIXME: if WEBHOOK_METHOD is get we should use params instead of data
    const response = await axios({
      timeout: WEBHOOK_TIMEOUT_SEC*1000,
      method: process.env.WEBHOOK_METHOD,
      url: process.env.WEBHOOK_URL,
      data: {
        deviceId,
        type,
        params
      }
    });

    if (response.status !== 200) {
      logger.warn(`Got response [${response.status}] ${response.data}`);
    }

    // we delete anyway message from the queue, maybe we should delete only if webhook ack us with a status 200
    await deleteMessage(messageId);

    logger.profile(`worker_${messageId}`);
    logger.debug(`succesfully sent message to webhook ${process.env.WEBHOOK_URL}`);
  }
}

/**
 * Start the worker polling from queue
 * 
 * @param {Number} pollingTimeSec - polling frequency from queue in seconds
 */
function startWorker(pollingTimeSec = 4) {
  setTimeout(
    async () => {
      logger.debug("executing worker function");
      await worker();
      
      startWorker(pollingTimeSec);
    },
    pollingTimeSec * 1000
  );
}

module.exports = {
  startWorker
}