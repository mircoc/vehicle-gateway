const RedisSMQ = require("rsmq");

const {getLogger} = require('./logger');

const logger = getLogger("Message Queue");

const rsmq = new RedisSMQ({
  // FIXME FIXME: here we don't support redis url, only host and port
  host: "192.168.99.100",
  port: 6379,
  // options: {
  //   url: process.env.REDIS_URL,
  // },
  ns: `${process.env.REDIS_KEYPREFIX}:${process.env.RSMQ_KEYPREFIX}`
});

const qname = process.env.RSMQ_QUEUE;

let queue_created = false;

const encoderSeparator = '|';

function encodeMessage(deviceId, type, params = {}) {
  return [deviceId, type, JSON.stringify(params)].join(encoderSeparator);
}

function decodeMessage(message) {
  const [deviceId, type, paramsJson] = message.split(encoderSeparator);
  const params = JSON.parse(paramsJson);
  return [deviceId, type, params];
}

async function initQueue() {
  return new Promise((resolve, reject) => {
    if (queue_created) {
      resolve();
      return;
    }
    rsmq.createQueue({ qname }, (err, resp) => {
      if (err) {
        // if the error is `queueExists` we can keep going as it tells us that the queue is already there
        if (err.name !== "queueExists") {
          logger.error(`[MessageQueue] initQueue() Error: ${err}`);
          reject(err);
          return;
        } else {
          logger.info(`[MessageQueue] initQueue() queue exists.. resuming.`);
          queue_created = true;
          resolve();
          return;
        }
      }
    
      if (resp === 1) {
        logger.info(`[MessageQueue] initQueue() queue created`);
        queue_created = true;
        resolve();
      }
    });
  });  
}

async function sendMessage(deviceId, type, params) {
  await initQueue();

  // send the messages
  return new Promise((resolve, reject) => {
    rsmq.sendMessage({
      qname,
      message: encodeMessage(deviceId, type, params),
    },
    (err) => {
      if (err) {
        logger.error(`[MessageQueue] sendMessage() Error: ${err}`);
        reject(err);
        return;
      }
  
      logger.info(`[MessageQueue] sendMessage() pushed new message into queue ${deviceId} - ${type}`);
      resolve();
    });
  });
}

/**
 * receiveMessage
 * 
 * @returns {Promise([messageId, deviceId, type, params])} Promise resolved with array [messageId, deviceId, type, params]
 */
async function receiveMessage() {
  await initQueue();
  
  return new Promise((resolve, reject) => {
    rsmq.receiveMessage({ qname }, (err, resp) => {
      if (err) {
        logger.error(`[MessageQueue] receiveMessage() error ${err}`);
        reject(err);
        return;
      }

      // checks if a message has been received
      if (resp.id) {
        logger.debug(`[MessageQueue] receiveMessage() received message ${resp.message}`);
        const [deviceId, type, params] = decodeMessage(resp.message);
        resolve([resp.id, deviceId, type, params]);
        
      } else {
        //logger.debug(`[MessageQueue] receiveMessage() no available message in queue..`);
        resolve([]);
      }
    });
  });
}

async function deleteMessage(messageId) {
  await initQueue();

  return new Promise((resolve, reject) => {
    rsmq.deleteMessage({ qname, id: messageId }, (err) => {
      if (err) {
        logger.error(`[MessageQueue] deleteMessage() error ${err}`);
        reject(err);
        return;
      }

      logger.debug(`[MessageQueue] deleteMessage() deleted message with id ${messageId}`);
      resolve();
    });
  });
}


module.exports = {
  sendMessage,
  receiveMessage,
  deleteMessage
};