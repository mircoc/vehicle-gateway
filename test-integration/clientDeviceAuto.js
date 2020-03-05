const net = require('net');
const uuid = require('uuid');


class BaseMessageHandler {
  constructor() {
    this.params = {};
    this.msgRxp = /invalid/;
    this.binary = false;
  }
  
  _parseParams() {
    // Implement in subclass
    return {};
  }

  /**
   * parseNew message
   * 
   * @param {String} message - message to test for validity for this handler
   * 
   * @returns {Boolean} if parsing was successful
   */
  parseNew(message) {
    // reset internal state for new message
    this.params = {};
    if (!message) {
      return false;
    }
    const result = message.match(this.msgRxp);
    if (!result) {
      return false;
    }
    this.params = this._parseParams(result);
    return true;
  }

  getLastParams() {
    return this.params;
  }

  getType() {
    return this.type;
  }
}
const MESSAGE_TYPES = {
  RUNREST: 'runRest',
  STATUS: 'status',
  REPORT: 'report',
  LEAVE: 'leave',
  HI: 'hi',
  PONG: 'pong',
};

class RunRestMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^HEY YOU, (RUN|REST)!$/m;
    this.type = MESSAGE_TYPES.RUNREST;
  }
  _parseParams(regexpResult) {
    return {
      runOrRest: regexpResult[1]
    }
  }
}
class StatusMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^HOW'S IT GOING\?$/m;
    this.type = MESSAGE_TYPES.STATUS;
  }
}
class HiMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^HI, NICE TO MEET YOU!$/m;
    this.type = MESSAGE_TYPES.HI;
  }
}
class PongMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^PONG.$/m;
    this.type = MESSAGE_TYPES.PONG;
  }
}
class ReportMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^KEEP ME POSTED EVERY ([0-9]+) SECONDS\.$/m;
    this.type = MESSAGE_TYPES.REPORT;
  }
  _parseParams(regexpResult) {
    return {
      postedEverySec: parseInt(regexpResult[1], 10),
    }
  }
}
class LeaveMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^GOTTA GO.$/m;
    this.type = MESSAGE_TYPES.LEAVE;
  }
}

const messagesHandlers = [
  new RunRestMessageHandler(),
  new StatusMessageHandler(),
  new ReportMessageHandler(),
  new LeaveMessageHandler(),
  new HiMessageHandler(),
  new PongMessageHandler()
];


function findMessageHandler(message) {
  let type, params, found = false;
  for (let i = 0; i < messagesHandlers.length; i++) {
    const handler = messagesHandlers[i];
    
    if (handler.parseNew(message)) {
      type = handler.getType();
      params = handler.getLastParams();
      found = true;
      break;
    }
  }
  return [found, type, params];
}

const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }))
}


const TCP_SERVER_PORT = 8070;



const deviceId = uuid.v4();

const RESTING_RUNNING = {
  RESTING: 'RESTING',
  RUNNING: 'RUNNING'
}
let statusRestingRunning = RESTING_RUNNING.RESTING;
let timerIdReporting;

function sendPing(onResponse) {
  onResponse('PING.')
}
function sendHello(onResponse) {
  onResponse(`HELLO, I'M ${deviceId}!`);
}
function sendStatus(onResponse) {
  onResponse("FINE. I'M HERE 43.62152 11.4638716, RESTING AND CHARGED AT 100%.");
}
function postedOk(onResponse) {
  onResponse('SURE, I WILL!');
}
let mustReportEverySec = 0;
function report(onResponse) {
  onResponse(`REPORT. I'M HERE 43.62152 11.4638716, ${statusRestingRunning} AND CHARGED AT 100%.`)
}
function runRestOk(onResponse) {
  onResponse('DONE!');
}


// creating a custom socket client and connecting it....
const client  = new net.Socket();
client.connect({
  port:TCP_SERVER_PORT
});

const onResponse = (message) => {
  console.log(`Sending message: ${message}`);
  client.write(message);
}

client.on('connect',async function(){
  console.log('Client: connection established with server');

  console.log('---------client details -----------------');
  const address = client.address();
  console.log(`Client is listening at port ${address.port}`);
  console.log(`Client ip : ${address.address}`);
  console.log(`Client is IP4/IP6 : ${address.family}`);
  console.log('\n');


  // // writing data to server
  // while (testMessageSent < TEST_MESSAGES.length) {
  //   console.log(`Press any key to send the message: ${TEST_MESSAGES[testMessageSent]}\n`)
  //   await keypress();
  //   client.write(TEST_MESSAGES[testMessageSent++]);
  // }
  
  // hello as soon as it connect
  setTimeout(() => sendHello(onResponse), 100);

  // heartbeat
  setInterval(() => sendPing(onResponse), 60*1000);

  console.log('Press any key to send: GOTTA GO\n');
  await keypress();
  client.end('GOTTA GO.');
});

client.setEncoding('utf8');

client.on('data',function(data){
  console.log(`SERVER: ${data}\n`);

  const [found, type, params] = findMessageHandler(data);
  if (!found) {
    console.log(`? unknown message`);
    return;
  }
  
  switch (type) {
    case MESSAGE_TYPES.RUNREST:
      if (params.runOrRest === 'RUN') {
        statusRestingRunning = RESTING_RUNNING.RUNNING;
      } else if (params.runOrRest === 'REST') {
        statusRestingRunning = RESTING_RUNNING.RESTING;
      }
      runRestOk(onResponse);
      break;

    case MESSAGE_TYPES.STATUS:
      sendStatus(onResponse);
      break;

    case MESSAGE_TYPES.LEAVE:
      client.end('SEE YA!');
      break;

    case MESSAGE_TYPES.REPORT:
      const everySec = params.postedEverySec;
      if (timerIdReporting) {
        clearInterval(timerIdReporting);
      }
      if (everySec) {
        timerIdReporting = setInterval(() => report(onResponse), everySec*1000);
      }
      postedOk(onResponse);
      break;

    default:
      break;
  }

});

client.on('close', () => {
  console.log(`closing connection\n`);
  process.exit(0);
})

