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

// Middleware - Allow all origins in development for testing with teammates
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://your-production-domain.com']
  : true; // Allow all origins in development

app.use(cors({
  origin: allowedOrigins,
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
app.use('/api/rooms', require('./routes/rooms'));

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[SERVER] Running on http://localhost:${PORT}`);
  console.log('[SOCKET] WebSocket ready');
});

module.exports = { app, server, io };
