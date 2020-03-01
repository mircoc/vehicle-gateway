const net = require('net');
const uuidv4 = require('uuid/v4');


const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }))
}

const deviceId = uuidv4();

const TEST_MESSAGES = [
  `HELLO, I'M ${deviceId}!`,
  'PING.'
];
let testMessageSent = 0;

// creating a custom socket client and connecting it....
const client  = new net.Socket();
client.connect({
  port:1234
});

client.on('connect',async function(){
  console.log('Client: connection established with server');

  console.log('---------client details -----------------');
  const address = client.address();
  console.log(`Client is listening at port ${address.port}`);
  console.log(`Client ip : ${address.address}`);
  console.log(`Client is IP4/IP6 : ${address.family}`);
  console.log('\n');


  // writing data to server
  while (testMessageSent < TEST_MESSAGES.length) {
    console.log(`Press any key to send the message: ${TEST_MESSAGES[testMessageSent]}\n`)
    await keypress();
    client.write(TEST_MESSAGES[testMessageSent++]);
  }

  console.log('No more test command to send, closing connection...\n');
  client.end('GOTTA GO.');
  // client.destroy();
  // process.exit(0);
  client.unref();
  process.exit(0);

});

client.setEncoding('utf8');

client.on('data',function(data){
  console.log(`SERVER: ${data}\n`);
});

// setTimeout(function(){
//   client.end('Bye bye server');
// },5000);