const {getLogger} = require('../logger');
const {getRedis, getSubscriptionRedis} = require('../redis');
const {getMessagesHandlers, getResponse, COMMAND_TYPES, composeCommand, COMMAND_RESPONSE_TYPES} = require('./expProtocol');
const {sendMessage} = require('../messageQueue');

const logger = getLogger("Vehicle");
const redis = getRedis();
const redisSubscription = getSubscriptionRedis();
const messagesHandlers = getMessagesHandlers();

function getVehicleConnectedKey(deviceId) {
  return `vehicle:lastConnected:${deviceId}`;
}

/**
 * Redis Key for channel user -> device
 * 
 * @param {String} deviceId 
 * 
 * @returns {String} Redis key
 */
function getUser2VehicleChannelKey(deviceId) {
  return `vehicle:channel:${deviceId}:user2vehicle`;
}
/**
 * Redis Key for channel device -> user
 * 
 * @param {String} deviceId 
 * 
 * @returns {String} Redis key
 */
function getVehicle2UserChannelKey(deviceId) {
  return `vehicle:channel:${deviceId}:vehicle2user`;
}

function vehicleConnectedValue(dateConnected) {
  const date = dateConnected ? dateConnected : new Date();
  return String(+date);
}

async function setVehicleConnected(deviceId, dateConnected) {
  // TODO: think if is it better to set an expire
  await redis.set(getVehicleConnectedKey(deviceId), vehicleConnectedValue(dateConnected));
}
async function setVehicleDISConnected(deviceId) {
  await redis.del(getVehicleConnectedKey(deviceId));
}

async function startVehicleChannel(deviceId) {
  const channelReceive = getUser2VehicleChannelKey(deviceId);
  
  return new Promise((resolve, reject) => {
    redisSubscription.subscribe(channelReceive, (err, count) => {
      if (err) {
        logger.error(`Error subscribing channel ${channelReceive}: ${err}`);
        reject(err);
      } else {
        logger.info(`Subscribed to channel: ${channelReceive} [${count}]`);
        resolve({channelReceive, count});
      }
    });
  });
}

async function closeVehicleChannel(deviceId) {
  const channelReceive = getUser2VehicleChannelKey(deviceId);
  await redisSubscription.unsubscribe(channelReceive);
}

async function startUserChannel(deviceId) {
  const channelReceive = getVehicle2UserChannelKey(deviceId);

  return new Promise((resolve, reject) => {
    redisSubscription.subscribe(channelReceive, (err, count) => {
      if (err) {
        logger.error(`Error subscribing channel ${channelReceive}: ${err}`);
        reject(err);
      } else {
        logger.info(`Subscribed to channel: ${channelReceive} [${count}]`);
        resolve({channelReceive, count});
      }
    });
  });
}

async function closeUserChannel(deviceId) {
  const channelReceive = getVehicle2UserChannelKey(deviceId);
  await redisSubscription.unsubscribe(channelReceive);
}



async function isVehicleConnected(deviceId) {
  const value = await redis.get(getVehicleConnectedKey(deviceId));
  
  // TODO: here we should check connected date and check for timeouts
  return Boolean(value);
}

function findMessageHandler(message) {
  let type, params, found = false;
  for (let i = 0; i < messagesHandlers.length; i++) {
    const handler = messagesHandlers[i];
    
    if (handler.parseNew(message)) {
      type = handler.getType();
      params = handler.getLastParams();
      found = true;
      break;
    }
  }
  return [found, type, params];
}

const RESPONSE_HANDLERS = {
  hello: onHello,
  ping: onPing,
  leave: onLeave,
  status: onSend2RedisResponse,
  report: onSend2QueueResponse,
  postedOk: onSend2RedisResponse,
  runRestOk: onSend2RedisResponse,
  runRestKo: onSend2RedisResponse,
};

// --- command handlers 

const COMMAND_HANDLERS = {
  [COMMAND_TYPES.STATUS]: onCommandSendResp,
  [COMMAND_TYPES.POSTED]: onCommandSendResp,
  [COMMAND_TYPES.NOPOSTED]: onCommandSendResp,
  [COMMAND_TYPES.RUN]: onCommandSendResp,
  [COMMAND_TYPES.REST]: onCommandSendResp,
  [COMMAND_TYPES.CLOSE]: onCommandSendResp,
}

function onCommandSendResp(type, deviceMessage, session, onResponse, onUpdateSession) {
  onResponse(deviceMessage);
}

// --- end command handlers ---

async function onHello(type, params, session, onResponse, onUpdateSession) {
  const response = getResponse(type);
  const deviceId = params.deviceId;

  await setVehicleConnected(deviceId);
  onUpdateSession('deviceId', deviceId);

  await startVehicleChannel(deviceId);

  await onResponse(response);
}

async function onPing(type, _params, session, onResponse, _onUpdateSession) {
  const response = getResponse(type);

  const deviceId = session.deviceId;
  if (deviceId) {
    // refresh last connection
    await setVehicleConnected(deviceId);

  } else {
    logger.warn("Missing deviceId on session");
  }

  if (response) {
    await onResponse(response);
  }
}

async function onSend2RedisResponse(type, params, session, onResponse, onUpdateSession) {
  const response = getResponse(type);
  const deviceId = session.deviceId;
  if (deviceId) {
    await publishToRedis(type, deviceId, params);

  } else {
    logger.warn("Missing deviceId on session");
  }

  if (response) {
    await onResponse(response);
  }
}

async function onSend2QueueResponse(type, params, session, _onResponse, _onUpdateSession) {
  const deviceId = session.deviceId;
  if (deviceId) {
    await publishToQueue(type, deviceId, params);
    
  } else {
    logger.warn("Missing deviceId on session");
  }
  
  // const response = getResponse(type);
  // if (response) {
  //   await onResponse(response);
  // }
}


async function onLeave(type, params, session, onResponse, onUpdateSession) {
  const response = getResponse(type);
  const deviceId = session.deviceId;
  if (deviceId) {
    setVehicleDISConnected(deviceId);
  } else {
    logger.warn("Missing deviceId on session");
  }

  if (response) {
    await onResponse(response);
  }
}

async function publishToQueue(type, deviceId, params) {
  await sendMessage(deviceId, type, params);
}

async function publishToRedis(type, deviceId, params) {
  const message = `${type}|${deviceId}|${JSON.stringify(params)}`;
  const channel = getVehicle2UserChannelKey(deviceId);
  logger.debug(`sending message to redis channel ${channel}: ${message}`);
  await redis.publish(channel, message);
}

function decodeRedisMessage(message) {
  const [type, deviceId, paramsJson] = message.split('|');
  try {
    const params = JSON.parse(paramsJson);
    return {type, deviceId, params};
  }
  catch (err) {
    logger.error(`decodeRedisMessage() json parse error for message: ${message}`);
  }
  return {type, deviceId, params: {}};
}

/**
 * handleVehicleMessage
 * 
 * @param {String} message - message received from vehicle device
 * @param {Object} session - connection session variables
 * @param {Function} onResponse - callback to write response message to vehicle device - onResponse(response:String):void
 * @param {Function} onUpdateSession - callback to update connection session with new variable - onUpdateSession(name:String, value:Any):void
 */
async function handleVehicleMessage(message, session, onResponse, onUpdateSession) {
  const [found, type, params] = findMessageHandler(message);
  if (!found) {
    logger.warn(`unknown message received`);
    return false;
  }

  logger.debug(`message type: ${type}, params: ${JSON.stringify(params)}`);
  
  const responseHandler = RESPONSE_HANDLERS[type];
  if (responseHandler) {
    await responseHandler(type, params, session, onResponse, onUpdateSession);
  } else {
    logger.debug("no response needed");
  }
}

async function handleCloseConnection(session) {
  const deviceId = session.deviceId;
  await closeVehicleChannel(deviceId);
}


/**
 * Handler for message received from redis that need to be sent to the device
 * 
 * @param {String} message - message received from redis
 * @param {Object} session - connection session
 * @param {Function} onResponse - callback to send the message to the device
 * @param {Function} onUpdateSession - callback to update the session
 */
async function handleUserMessage(message, session, onResponse, onUpdateSession) {
  const [type, destinationDeviceId, deviceMessage] = message.split('|');
  const deviceId = session.deviceId;
  if (deviceId !== destinationDeviceId) {
    console.warn(`somethin bad happened, socket deviceId: ${deviceId}, redis message deviceId: ${destinationDeviceId}`);
    // better don't proceed
    return;
  }

  logger.debug(`Sending message type ${type}: ${deviceMessage}`);
  const commandHandler = COMMAND_HANDLERS[type];
  if (commandHandler) {
    await commandHandler(type, deviceMessage, session, onResponse, onUpdateSession);
  } else {
    logger.warn(`no command handler defined for ${type}`);
  }
}

/**
 * Send a command for the device to redis
 * 
 * @param {String} deviceId - device id
 * @param {COMMAND_TYPES} type - type of command to send
 * @param {Object} params - commanda parameters
 */
async function sendCommand(deviceId, type, params) {
  const command = composeCommand(type, params);
  const message = `${type}|${deviceId}|${command}`;

  const channel = getUser2VehicleChannelKey(deviceId);

  logger.debug(`sending message to redis channel ${channel}: ${message}`);
  await redis.publish(channel, message);
}

module.exports = {
  isVehicleConnected,
  handleVehicleMessage,
  handleUserMessage,
  getVehicle2UserChannelKey,
  getUser2VehicleChannelKey,
  handleCloseConnection,
  sendCommand,
  startUserChannel,
  COMMAND_TYPES,
  decodeRedisMessage,
  closeUserChannel,
  COMMAND_RESPONSE_TYPES,
}