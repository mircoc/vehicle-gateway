const {getLogger} = require('../logger');
const {getRedis} = require('../redis');
const {getMessagesHandlers, getResponse} = require('./expProtocol');

const logger = getLogger("Vehicle");
const redis = getRedis();
const messagesHandlers = getMessagesHandlers();

function vehicleConnectedKey(deviceId) {
  return `vehicle:lastConnected:${deviceId}`;
}
function vehicleSendChannelKey(deviceId) {
  return `vehicle:channel:${deviceId}:send`;
}
function vehicleReceiveChannelKey(deviceId) {
  return `vehicle:channel:${deviceId}:receive`;
}

function vehicleConnectedValue(dateConnected) {
  const date = dateConnected ? dateConnected : new Date();
  return String(+date);
}

async function setVehicleConnected(deviceId, dateConnected) {
  // TODO: think if is it better to set an expire
  await redis.set(vehicleConnectedKey(deviceId), vehicleConnectedValue(dateConnected));
}
async function setVehicleDISConnected(deviceId) {
  await redis.del(vehicleConnectedKey(deviceId));
}

// FIXME 
// FIXME missing redis message event handler that understand if it's a message
// FIXME that need to be handled from my instance
// FIXME 
function startVehicleChannel(deviceId, onResponse) {
  const channelSend = vehicleSendChannelKey(deviceId);
  const channelReceive = vehicleReceiveChannelKey(deviceId);

  redis.subscribe(channelReceive, (err, count) => {
    if (err) {
      logger.error(`Error subscribing channel ${channelReceive}: ${err}`);
    } else {
      logger.info(`Subscribed to channel: ${channelReceive} [${count}]`);
    }
  })
}



// redis.subscribe("news", "music", function(err, count) {
//   // Now we are subscribed to both the 'news' and 'music' channels.
//   // `count` represents the number of channels we are currently subscribed to.

//   pub.publish("news", "Hello world!");
//   pub.publish("music", "Hello again!");
// });

// redis.on("message", function(channel, message) {
//   // Receive message Hello world! from channel news
//   // Receive message Hello again! from channel music
//   console.log("Receive message %s from channel %s", message, channel);
// });








async function isVehicleConnected(deviceId) {
  const value = await redis.get(vehicleConnectedKey(deviceId));
  
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
}

async function onHello(type, params, session, onResponse, onUpdateSession) {
  const response = getResponse(type);
  const deviceId = params.deviceId;

  await setVehicleConnected(deviceId);
  onUpdateSession('deviceId', deviceId);

  // FIXME: open pub/sub channel
  // FIXME:  need to save that this instance is connected to this deviceId
  // FIXME:  and should receive commanda from the receive channell

  await onResponse(response);
}

async function onPing(type, _params, session, onResponse, _onUpdateSession) {
  const response = getResponse(type);

  const deviceId = session.deviceId;
  if (deviceId) {
    setVehicleDISConnected(deviceId);
  } else {
    logger.warn("Missing deviceId on session");
  }

  // refresh last connection
  await setVehicleConnected(deviceId);

  await onResponse(response);
}

async function onLeave(type, params, session, onResponse, onUpdateSession) {
  const response = getResponse(type);
  const deviceId = session.deviceId;
  if (deviceId) {
    setVehicleDISConnected(deviceId);
  } else {
    logger.warn("Missing deviceId on session");
  }

  await onResponse(response);
}

/**
 * handleMessage
 * 
 * @param {String} data - message received from vehicle device
 * @param {Object} session - connection session variables
 * @param {Function} onResponse - callback to write response message to vehicle device - onResponse(response:String):void
 * @param {Function} onUpdateSession - callback to update connection session with new variable - onUpdateSession(name:String, value:Any):void
 */
async function handleMessage(data, session, onResponse, onUpdateSession) {
  const [found, type, params] = findMessageHandler(data);
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

module.exports = {
  isVehicleConnected,
  handleMessage,
}