const Redis = require("ioredis");

function createRedisClient() {
  const redis = new Redis(process.env.REDIS_URL, {
    keyPrefix: `${process.env.REDIS_KEYPREFIX}:`,
  });
  return redis;
}

const mainRedisClient = createRedisClient();
const subscriptionRedisClient = {};


function getRedis() {
  return mainRedisClient;
}
function getSubscriptionRedis(type = 'main') {
  if (!type) {
    throw new Error('invalid redis subscription type');
  }
  if (subscriptionRedisClient[type]) {
    return subscriptionRedisClient[type];
  }

  subscriptionRedisClient[type] = createRedisClient();
  return subscriptionRedisClient[type];
}

module.exports = {
  getRedis,
  getSubscriptionRedis
};