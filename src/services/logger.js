const winston = require('winston');

const isDev = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'vehicle-gateway' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ],
  exceptionHandlers: isDev ? undefined : [
    new winston.transports.File({ filename: 'exceptions.log' })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.prettyPrint(),
      winston.format.splat(),
      winston.format.simple(),
      winston.format.printf((args) => {
        const { level, label, message, timestamp } = args;
        // console.log(args)
        return `${timestamp} [${label}] ${level}: ${message}`;
      })
    ),
  }));
}

/**
 * getLogger - return a logger with a bound label name
 * 
 * @param {String} label - name of the label to log for
 */
function getLogger(label) {
  return {
    error: (message) => logger.log({ level: 'error', message, label }),
    warn: (message) => logger.log({ level: 'warn', message, label }),
    info: (message) => logger.log({ level: 'info', message, label }),
    verbose: (message) => logger.log({ level: 'verbose', message, label }),
    debug: (message) => logger.log({ level: 'debug', message, label }),
  }
}

module.exports = {
  getLogger
};