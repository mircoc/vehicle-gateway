/**
 * 
 * Middleware creator that catch failing promises and forward the error
 * useful for async routes
 * 
 * @param {Function} fn - route to catch errors for
 * 
 */
const asyncCatcher =  fn => (...args) => {
  const fnReturn = fn(...args);
  const next = args[args.length-1]; // last argument
  return Promise.resolve(fnReturn).catch(next);
}

module.exports = asyncCatcher;
