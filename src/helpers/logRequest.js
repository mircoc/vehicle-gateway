
/**
 * 
 * Middleware creator for logging requests
 * 
 */
const logRequest = logger => (req, _res, next) => {
  logger.debug(req.originalUrl);
  next();
}

module.exports = logRequest;
