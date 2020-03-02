/**
 * ExplodingScooters vehicles use "exp protocol" defined here, 
 * 
 * there may be other vehicles protocols, but the interface defined in this folder must be the same for all
*/

/**
 * Base class for messages handler
 */
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

class HelloMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^HELLO, I'M ([^!]+)!$/m;
    this.type = 'hello';
  }
  _parseParams(regexpResult) {
    return {
      deviceId: regexpResult[1]
    }
  }
}
class PingMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^PING\.$/m;
    this.type = 'ping';
  }
}
class StatusMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^FINE\. I'M HERE ([0-9\.]+) ([0-9\.]+), (RESTING|RUNNING) AND CHARGED AT ([0-9]+)%\.$/m;
    this.type = 'status';
  }
  _parseParams(regexpResult) {
    return {
      latitude: regexpResult[1],
      longitude: regexpResult[2],
      running: (regexpResult[3] === 'RUNNING' ? true : false),
      charge: regexpResult[4]
    }
  }
}
class ReportMessageHandler extends StatusMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^REPORT\. I'M HERE ([0-9\.]+) ([0-9\.]+), (RESTING|RUNNING) AND CHARGED AT ([0-9]+)%\.$/m;
    this.type = 'report';
  }
}
class PostedOkMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^SURE, I WILL!$/m;
    this.type = 'postedOk';
  }
}
class RunRestOkMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^DONE!$/m;
    this.type = 'runRestOk';
  }
}
class RunRestKoMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^I CAN'T, SORRY.$/m;
    this.type = 'runRestKo';
  }
}
class LeaveMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^GOTTA GO.$/m;
    this.type = 'leave';
  }
}
class LeaveAckMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^SEE YA!$/m;
    this.type = 'leaveAck';
  }
}
class BugMessageHandler extends BaseMessageHandler {
  constructor() {
    super();
    this.msgRxp = /^WTF! ([0-9]+)$/m;;
    this.type = 'bugReport';
    this.binary = true;
  }
  _parseParams(regexpResult) {
    return {
      bytes: regexpResult[1]
    }
  }
}


const helloMessageHandler = new HelloMessageHandler();
const pingMessageHandler = new PingMessageHandler();
const statusMessageHandler = new StatusMessageHandler();
const reportMessageHandler = new ReportMessageHandler();
const postedOkMessageHandler = new PostedOkMessageHandler();
const runRestOkMessageHandler = new RunRestOkMessageHandler();
const runRestKoMessageHandler = new RunRestKoMessageHandler();
const leaveMessageHandler = new LeaveMessageHandler();
const leaveAckMessageHandler = new LeaveAckMessageHandler();
const bugMessageHandler = new BugMessageHandler();

const MESSAGES_HANDLERS = [
  helloMessageHandler,
  pingMessageHandler,
  statusMessageHandler,
  reportMessageHandler,
  postedOkMessageHandler,
  runRestKoMessageHandler,
  runRestOkMessageHandler,
  leaveAckMessageHandler,
  leaveMessageHandler,
  bugMessageHandler
];

function getMessagesHandlers() {
  return MESSAGES_HANDLERS;
}

const RESPONSES = {
  hello: 'HI, NICE TO MEET YOU!',
  ping: 'PONG.',
  report: 'OK, THANKS!',
  leave: 'SEE YA!',
  bugReport: 'DAAAMN! ISSUE REPORTED ON JIRA',
}

function getResponse(msgType) {
  return RESPONSES[msgType];
}

module.exports = {
  getMessagesHandlers,
  getResponse
}