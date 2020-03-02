const assert = require('assert');

const protocol = require('../src/services/vehicle/expProtocol');
const handlers = protocol.getMessagesHandlers();

function testMessage(message) {
  let type, params, found = false;
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    //console.log(handler.getType())
    if (handler.parseNew(message)) {
      type = handler.getType();
      params = handler.getLastParams();
      found = true;
      break;
    }
  }
  return [found, type, params];
}

describe('ExplodingScooters message protocol', () => {
  describe('HELLO message', () => {
    it('should understand valid message', () => {
      const deviceId = '9180af05-0219-4c88-8a95-3da86b130d43';
      const message = `HELLO, I'M ${deviceId}!`;

      const [found, type, params] = testMessage(message);
      
      assert.equal(found, true);
      assert.equal(type, 'hello');
      assert.deepEqual(params, {deviceId});
    });

    it('should refuse invalid message missing im', () => {
      const deviceId = '9180af05-0219-4c88-8a95-3da86b130d43';
      const message = `HELLO, ${deviceId}!`;

      const [found] = testMessage(message);
      
      assert.equal(found, false);
    });

    it('should refuse invalid message no new line', () => {
      const deviceId = '9180af05-0219-4c88-8a95-3da86b130d43';
      const message = `HELLO, I'M ${deviceId}!HELLO, I'M ${deviceId}!`;

      const [found] = testMessage(message);
      
      assert.equal(found, false);
    });

  });

  describe('PING message', () => {
    it('should understand valid message', () => {
      const message = `PING.`;

      const [found, type, params] = testMessage(message);
      
      assert.equal(found, true);
      assert.equal(type, 'ping');
      assert.deepEqual(params, {});
    });

    it('should refuse invalid message missing .', () => {
      const message = `PING`;

      const [found] = testMessage(message);
      
      assert.equal(found, false);
    });

    it('should refuse invalid message no new line', () => {
      const message = `PING.PING.`;

      const [found] = testMessage(message);
      
      assert.equal(found, false);
    });

  });

  describe('STATUS message', () => {
    it('should understand valid message', () => {
      const latitude = '45.021561650';
      const longitude = '8.156484';
      const runningMsg = 'RESTING';
      const running = false;
      const charge = '42';
      const message = `FINE. I'M HERE ${latitude} ${longitude}, ${runningMsg} AND CHARGED AT ${charge}%.`;

      const [found, type, params] = testMessage(message);
      
      assert.equal(found, true);
      assert.equal(type, 'status');
      assert.deepEqual(params, {
        latitude,
        longitude,
        running,
        charge
      });
    });

    it('should refuse invalid message missing im', () => {
      const latitude = '45.021561650';
      const longitude = '8.156484';
      const runningMsg = 'RESTING';
      const charge = '42';
      const message = `PIPPO. I'M HERE ${latitude} ${longitude}, ${runningMsg} AND CHARGED AT ${charge}%.`;


      const [found] = testMessage(message);
      
      assert.equal(found, false);
    });

    it('should refuse invalid message no new line', () => {
      const latitude = '45.021561650';
      const longitude = '8.156484';
      const runningMsg = 'RESTING';
      const charge = '42';
      const message = `FINE. I'M HERE ${latitude} ${longitude}, ${runningMsg} AND CHARGED AT ${charge}%.PING`;


      const [found] = testMessage(message);
      
      assert.equal(found, false);
    });

  });
})