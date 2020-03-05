const express = require('express');

const {getSubscriptionRedis } = require('../redis');
const {getLogger} = require('../logger');
const asyncCatcher = require('../../helpers/asyncCatcher');
const {closeUserChannel, isVehicleConnected, startUserChannel, sendCommand, COMMAND_TYPES, decodeRedisMessage, COMMAND_RESPONSE_TYPES} = require('../vehicle');

const logger = getLogger("device route");
const router = express.Router();
const redisSubscription = getSubscriptionRedis();

const TIMEOUT_SEC = 20;

async function sendCommandToDevice(deviceId, commandType, commandParams, responseType, responseTypeKo = 'notexistingcommand') {
  const isConnected = await isVehicleConnected(deviceId);
  if (!isConnected) {
    return {
      offline: true,
      online: false,
      deviceId,
      timestamp: +(new Date()),
    };
  }

  await startUserChannel(deviceId);
  await sendCommand(deviceId, commandType, commandParams);

  let resultFound = false;
  return new Promise((resolve, _reject) => {
    redisSubscription.on('message', async (channel, message) => {
      logger.debug(`redis received message on channel ${channel}: ${message}`);
      
      const {type, deviceId:deviceIdDecoded, params} = decodeRedisMessage(message);
      if (deviceIdDecoded !== deviceId) {
        logger.warn(`invalid message received ${deviceIdDecoded} not ${deviceId}`);
        return;
      }

      switch (type) {
        case responseType:
          const result = {
            ...params,
            deviceId,
            timestamp: +(new Date()),
            ack: true,
            offline: false,
            online: true,
          };
          resultFound = true;
          await closeUserChannel(deviceId);
  
          resolve(result);
          return;

        case responseTypeKo:
          const resultKo = {
            ...params,
            deviceId,
            timestamp: +(new Date()),
            ack: false,
            offline: false,
            online: true,
          };
          resultKoFound = true;
          await closeUserChannel(deviceId);
  
          resolve(result);
          return;

        default:
          break;
      }
    });
    
  
    setTimeout(
      async () => {
        // 
        if (!resultFound) {
          logger.warn(`Timed out for device id: ${deviceId}`);
          await closeUserChannel(deviceId);
          resolve({
            timeout: true,
            noResponseInSec: TIMEOUT_SEC,
            error: 'TIMEOUT'
          });
        }
      },
      TIMEOUT_SEC*1000
    );
  });
}

/**
 * Device router should allow:
 * 
 * - To fetch information about the vehicle: if it’s connected or not, and, if it’s connected,
 *   current location, battery charge and running status.
 * - To set the update frequency to a desired interval.
 * - To send commands to turn on or off the vehicle.
 * - To disconnect the vehicle on purpose
 */

 /**
  * Get device information (if requested device is connected)
  */
router.get('/:deviceId', asyncCatcher(async (req, res) => {

  const deviceId = req.params.deviceId;

  const result = await sendCommandToDevice(
    deviceId,
    COMMAND_TYPES.STATUS,
    {},
    COMMAND_RESPONSE_TYPES.GOT_STATUS
  );

  res.json(result);
}));

/**
 * Set update frequency to get information every {{request.body.frequency}} seconds, the system will
 * propagate information received to the webhook configured
 * use 0 for clearing the update cicle
 */
router.put('/:deviceId/update', asyncCatcher(async (req, res) => {
  const deviceId = req.params.deviceId;
  const seconds = req.body.frequency;

  const result = await sendCommandToDevice(
    deviceId,
    seconds ? COMMAND_TYPES.POSTED : COMMAND_TYPES.NOPOSTED,
    {
      seconds
    },
    COMMAND_RESPONSE_TYPES.OK_POSTED
  );
  
  res.json(result);
}));

/**
 * Turn on device (in running mode)
 */
router.post('/:deviceId/run', asyncCatcher(async (req, res) => {
  const deviceId = req.params.deviceId;

  const result = await sendCommandToDevice(
    deviceId,
    COMMAND_TYPES.RUN,
    {},
    COMMAND_RESPONSE_TYPES.OK_RUN,
    COMMAND_RESPONSE_TYPES.KO_RUN,
  );
  
  res.json(result);
}));

/**
 * Turn off device (in rest mode)
 */
router.post('/:deviceId/rest', asyncCatcher(async (req, res) => {
  const deviceId = req.params.deviceId;

  const result = await sendCommandToDevice(
    deviceId,
    COMMAND_TYPES.REST,
    {},
    COMMAND_RESPONSE_TYPES.OK_REST,
    COMMAND_RESPONSE_TYPES.KO_REST,
  );
  
  res.json(result);
}));

/**
 * Disconnect device
 */
router.delete('/:deviceId', asyncCatcher(async (req, res) => {
  const deviceId = req.params.deviceId;

  const result = await sendCommandToDevice(
    deviceId,
    COMMAND_TYPES.CLOSE,
    {},
    COMMAND_RESPONSE_TYPES.OK_LEAVE
  );
  
  res.json(result);
}));

module.exports = router;
