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
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const reservationRoutes = require('./routes/reservations');
const docsRoutes = require('./routes/docs');
const reserveController = require('./controllers/reserveController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:8080", 
      "http://localhost:8081", 
      "http://192.168.0.109:8081",
      "https://cgs-csms.dharmap.com",
      "http://cgs-csms.dharmap.com"
    ],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:8080', 
    'http://localhost:8081', 
    'http://192.168.0.109:8081', 
    'http://192.168.0.109:8080',
    'https://cgs-csms.dharmap.com',
    'http://cgs-csms.dharmap.com'
  ],
  credentials: true
}));
app.use(express.json());

// Public documentation routes (MUST be before other /api routes)
app.use('/docs', docsRoutes);

// Protected routes (with auth middleware)
app.use('/api/auth', authRoutes);
app.use('/api', stationRoutes);
app.use('/api', monitoringRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/reservations', reservationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint to check auth headers
app.get('/debug-auth', (req, res) => {
  res.json({
    headers: req.headers,
    authorization: req.headers.authorization,
    cookies: req.cookies
  });
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
    
    // Start cleanup cron job for expired reservations (every 5 minutes)
    setInterval(async () => {
      const cleaned = await reserveController.cleanupExpiredReservations();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired reservations`);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Start HTTP server with Socket.IO
    server.listen(PORT, '0.0.0.0' , () => {
      console.log(`HTTP Server running on port ${PORT}`);
      console.log(`WebSocket server running for real-time updates`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();