const { io } = require('socket.io-client');

console.log('Testing Socket.IO connection...');

const socket = io('http://192.168.0.109:3000', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connected successfully!');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket.IO disconnected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error.message);
});

socket.on('transaction_started', (data) => {
  console.log('📨 Received transaction_started:', data);
});

socket.on('transaction_stopped', (data) => {
  console.log('📨 Received transaction_stopped:', data);
});

socket.on('meter_values', (data) => {
  console.log('📨 Received meter_values:', data);
});

// Keep the script running
setTimeout(() => {
  console.log('Test completed. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);