const Pusher = require('pusher-js');

const pusher = new Pusher('MvvnVXsfh5j64mVzxwgvL29N5mmNMNEEGMSMtvc5w', {
  wsHost: 'ws.vazi.io.vn',
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
  cluster: 'mt1'
});

pusher.connection.bind('state_change', function(states) {
  console.log('Pusher State changed:', states);
});
pusher.connection.bind('connected', function() {
  console.log('Successfully connected to Pusher!');
  process.exit(0);
});
pusher.connection.bind('error', function(err) {
  console.error('Pusher Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log("Timeout waiting for connection");
  process.exit(1);
}, 10000);
