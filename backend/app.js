const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const { initializeSocket } = require('./socket');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Socket.io
const io = initializeSocket(server);

// Make io accessible in routes/controllers
app.set('io', io);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware - logs all API activity
app.use('/api', requestLogger);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/video', require('./routes/video'));
app.use('/api/chat', require('./routes/chat'));

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('[SERVER] Running on http://localhost:' + PORT);
  console.log('[API] Endpoints available at http://localhost:' + PORT + '/api');
  console.log('[SOCKET] WebSocket server ready for connections');
  console.log('='.repeat(60) + '\n');
  console.log('[INFO] All API requests will be logged below');
  console.log('[INFO] Waiting for connections...\n');
});

module.exports = { app, server, io };
