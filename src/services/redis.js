const Redis = require("ioredis");

function createRedisClient() {
  const redis = new Redis(process.env.REDIS_URL, {
    keyPrefix: `${process.env.REDIS_KEYPREFIX}:`,
  });
  return redis;
}

const mainRedisClient = createRedisClient();


function getRedis() {
  return mainRedisClient;
}

module.exports = {
  getRedis
};