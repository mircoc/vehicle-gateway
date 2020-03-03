const express = require('express');

const {getSubscriptionRedis } = require('../redis');
const {getLogger} = require('../logger');
const asyncCatcher = require('../../helpers/asyncCatcher');
const {closeUserChannel, isVehicleConnected, startUserChannel, sendCommand, COMMAND_TYPES, decodeRedisMessage, COMMAND_RESPONSE_TYPES} = require('../vehicle');

const logger = getLogger("device route");
const router = express.Router();
const redisSubscription = getSubscriptionRedis();

const TIMEOUT_SEC = 20;

router.get('/:deviceId', asyncCatcher(async (req, res) => {  

  const deviceId = req.params.deviceId;

  const isConnected = await isVehicleConnected(deviceId);
  if (!isConnected) {
    res.json({offline: true});
    return;
  }

  await startUserChannel(deviceId);
  await sendCommand(deviceId, COMMAND_TYPES.STATUS);

  let resultFound = false;
  redisSubscription.on('message', async (channel, message) => {
    logger.debug(`redis received message on channel ${channel}: ${message}`);
    
    const {type, deviceId:deviceIdDecoded, params} = decodeRedisMessage(message);
    switch (type) {
      case COMMAND_RESPONSE_TYPES.GOT_STATUS:
        if (deviceIdDecoded !== deviceId) {
          logger.warn(`invalid message received ${deviceIdDecoded} not ${deviceId}`);
          return;
        }

        const result = {
          ...params,
          deviceId,
          timestamp: +(new Date())
        };
        resultFound = true;
        await closeUserChannel(deviceId);

        res.json(result);
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
        res.json({
          timeout: true,
          noResponseInSec: TIMEOUT_SEC,
          error: 'TIMEOUT'
        });
      }
    },
    TIMEOUT_SEC*1000
  );
}));


module.exports = router;
