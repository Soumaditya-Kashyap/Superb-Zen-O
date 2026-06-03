const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const authMiddleware = require('./middlewares/authMiddleware');
// Load environment variables first
dotenv.config();

// Pre-load all models to ensure they're registered before any service uses them
require('./models/user');
require('./models/movie');
require('./models/Connection');
require('./models/ChatRoom');
require('./models/Message');
require('./models/WatchRoom');
require('./models/Notification');
require('./models/SupportMessage');

const { initializeSocket } = require('./socket');
const notificationService = require('./utils/notificationService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Socket.io
const io = initializeSocket(server);

// Make io accessible in routes/controllers
app.set('io', io);

// Register io with notification service for global access
notificationService.setSocketIO(io);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://superb-zen-dngldjs41-soumaditya-kashyaps-projects.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
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

// Dynamic TURN Credentials Route
app.get('/api/rtc/turn', async (req, res) => {
  try {
    const apiKey = process.env.METERED_API_KEY;
    if (!apiKey) {
      console.warn('[RTC-TURN] METERED_API_KEY is not set. Client will fallback to static servers.');
      return res.json({ servers: [] });
    }

    console.log('[RTC-TURN] Requesting dynamic credentials from Metered.ca...');
    const response = await fetch(`https://metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Metered API responded with status ${response.status}`);
    }
    const servers = await response.json();
    console.log('[RTC-TURN] Successfully retrieved dynamic credentials.');
    res.json({ servers });
  } catch (err) {
    console.error('[RTC-TURN] Failed to fetch TURN credentials:', err.message);
    // Return empty list so client falls back gracefully rather than crashing the page
    res.json({ servers: [] });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/video', require('./routes/video'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/support', require('./routes/supportRoutes'));



app.use(
   "/api/youtube",
   require("./routes/youtube")
);

app.use(
    "/api/profile",
    authMiddleware, // Ensure user is authenticated for profile routes
    require("./routes/profile")
);

app.use(
    "/api/user",
    authMiddleware, require("./routes/setting") // Ensure user is authenticated for setting routes
    
);

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[SERVER] Running on http://localhost:${PORT}`);
  console.log('[SOCKET] WebSocket ready');
});

module.exports = { app, server, io };
