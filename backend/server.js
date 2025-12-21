const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectDB } = require('./config/database');
const OCPPServer = require('./ocpp/server');

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8080", "http://localhost:8081", "http://192.168.0.109:8081"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://192.168.0.109:8081', 'http://192.168.0.109:8080'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', stationRoutes);
app.use('/api', monitoringRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Frontend client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Frontend client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
const OCPP_PORT = process.env.OCPP_PORT || 8082;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start OCPP WebSocket server
    const ocppServer = new OCPPServer(OCPP_PORT, io);
    global.ocppServer = ocppServer; // Make it globally accessible
    ocppServer.start();
    
    // Start HTTP server with Socket.IO
    server.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT}`);
      console.log(`WebSocket server running for real-time updates`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();