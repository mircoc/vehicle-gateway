const {getLogger} = require('../logger');
const {getRedis} = require('../redis');

const logger = getLogger("Vehicle");
const redis = getRedis();

function vehicleConnectedKey(deviceId) {
  return `vehicle:lastConnected:${deviceId}`;
}

function vehicleConnectedValue(dateConnected) {
  const date = dateConnected ? dateConnected : new Date();
  return String(+date);
}

async function setVehicleConnected(deviceId, dateConnected) {
  // TODO: think if is it better to set an expire
  await redis.set(vehicleConnectedKey(deviceId), vehicleConnectedValue(dateConnected));
}

async function isVehicleConnected(deviceId) {
  const value = await redis.get(vehicleConnectedKey(deviceId));
  
  // TODO: here we should check connected date and check for timeouts
  return Boolean(value);
}

module.exports = {
  isVehicleConnected,
  setVehicleConnected
}