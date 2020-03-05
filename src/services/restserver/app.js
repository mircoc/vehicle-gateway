const createError = require('http-errors');
const express = require('express');

const {getLogger} = require('../logger');
const {startWorker} = require('./webHookWorker');
const logReqest = require('../../helpers/logRequest')

const logger = getLogger("REST Server App");

async function appCreator() {

  // start webhook dequeue and call worker
  // check for message to process every 5 seconds
  startWorker(5);


  const deviceRouter = require('./deviceRouter');
  
  const app = express();
  
  // app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // app.use(cookieParser());
  
  app.use('/api/device', logReqest(logger), deviceRouter);
  
  // catch 404 and forward to error handler
  app.use(function(req, _res, next) {
    logger.warn(`route not found: ${req.originalUrl}`);
    next(createError(404));
  });
  
  // error handler
  app.use(function(err, _req, res, _next) {
  
    if (err.stack) {
      logger.error(` --> Error: ${err.message}\n ----> stack trace: ${err.stack}`);
    } else {
      logger.error(` --> Error: ${err.message}`);
    }

    res.status(err.status || 500);
    
    res.send({
      status: "fail",
      error: {
        status: err.status || 500,
        msg: err.message,
      }
    });

  });

  return app;
}

module.exports = {
  appCreator
};
