// const net = require('net');

const {getLogger} = require('../logger');
const {handleMessage} = require('../vehicle');


const logger = getLogger("TCP Server app");

function getDeviceId4Log(socket) {
  if (!socket) {
    return '?';
  }
  return socket._vehicleSession ? socket._vehicleSession.deviceId ? socket._vehicleSession.deviceId : '-' : '-';
}

function app(socket) {  
  logger.info('client connected');

  socket.setEncoding('utf8');

  socket.setTimeout(800000,function(){
    // called after timeout -> same as socket.on('timeout')
    // it just tells that soket timed out => its ur job to end or destroy the socket.
    // socket.end() vs socket.destroy() => end allows us to send final data and allows some i/o activity to finish before destroying the socket
    // whereas destroy kills the socket immediately irrespective of whether any i/o operation is goin on or not...force destry takes place
    logger.info('Socket timed out');
  });
  
  
  socket.on('data', (data) => {
    // logger.debug(`Bytes read: ${socket.bytesRead}. Bytes written: ${socket.bytesWritten}`);

    logger.debug(`[${getDeviceId4Log(socket)}] Data received from server: ${data}`);
  
    handleMessage(
      data,
      socket._vehicleSession,
      (response) => {
        logger.debug(`[${getDeviceId4Log(socket)}] Send response: ${response}`);
        const flushedAll = socket.write(response);
        if (!flushedAll) {
          logger.debug(`[${getDeviceId4Log(socket)}] write buffer full, pausing...`);
          socket.pause();
        }
      },
      (socketSessionName, socketSessionValue) => {
        const currentSession = socket._vehicleSession ? socket._vehicleSession : {};
        socket._vehicleSession = {
          ...currentSession,
          [socketSessionName]: socketSessionValue
        };
        logger.debug(`[${getDeviceId4Log(socket)}] session update for ${socketSessionName}: ${socketSessionValue}`);
      }
    );
  });
  
  socket.on('drain', () => {
    logger.debug(`[${getDeviceId4Log(socket)}] write buffer empty now, resuming...`);
    socket.resume();
  });
  
  socket.on('error',function(error){
    logger.error(`[${getDeviceId4Log(socket)}] socket error: ${error}`);
  });
  
  socket.on('timeout',function(){
    logger.info(`[${getDeviceId4Log(socket)}] Socket timed out !`);
    socket.end('Timed out!');
    // can call socket.destroy() here too.
  });
  
  socket.on('end',function(data){
    logger.info(`[${getDeviceId4Log(socket)}] client disconnected`);
    logger.debug(`[${getDeviceId4Log(socket)}] End data: ${data}`);
  });
  
  socket.on('close',function(error){
    logger.debug(`[${getDeviceId4Log(socket)}] Bytes read: ${socket.bytesRead}. Bytes written: ${socket.bytesWritten}`);
    logger.debug(`[${getDeviceId4Log(socket)}] Socket closed!`);
    if(error){
      logger.error(`[${getDeviceId4Log(socket)}] Socket was closed coz of transmission error`);
    }
  }); 






}

module.exports = app;