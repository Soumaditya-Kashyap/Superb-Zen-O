---
inclusion: auto
---

# Project Structure

## Root Layout

```
/
├── backend/          # Node.js/Express API server
├── frontend/         # React/Vite client application
├── docs/             # Architecture documentation
└── .kiro/            # Kiro configuration and specs
```

## Backend Structure

```
backend/
├── app.js                    # Main server entry point
├── socket.js                 # Socket.io initialization and event handlers
├── config/
│   └── database.js           # MongoDB connection setup
├── controllers/              # Request handlers organized by domain
│   ├── auth/                 # Authentication (login, register, preferences)
│   ├── admin/                # Admin operations (movies, scraping, stats)
│   ├── chat/                 # Chat messaging (friends, messages, users)
│   ├── movie/                # Movie operations (search, details, favorites)
│   ├── notification/         # Notification management
│   └── room/                 # Watch room operations
├── middlewares/
│   ├── authMiddleware.js     # JWT verification
│   ├── errorHandler.js       # Global error handling
│   └── requestLogger.js      # API request logging
├── models/                   # Mongoose schemas
│   ├── user.js
│   ├── movie.js
│   ├── WatchRoom.js
│   ├── ChatRoom.js
│   ├── Message.js
│   ├── Connection.js
│   └── Notification.js
├── routes/                   # Express route definitions
├── utils/
│   ├── movieScraper.js       # Movie data scraping utilities
│   ├── notificationService.js
│   └── notification/         # Notification helpers
└── scripts/                  # Database population scripts
```

## Frontend Structure

```
frontend/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Root component with routing
│   ├── index.css             # Global styles (Tailwind)
│   ├── pages/                # Route components
│   │   ├── Auth.jsx
│   │   ├── Home.jsx
│   │   ├── WatchRoom.jsx     # Collaborative watch experience
│   │   ├── Chat.jsx
│   │   ├── Movies.jsx
│   │   ├── Categories.jsx
│   │   └── MySpace.jsx
│   ├── components/           # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── MovieCard.jsx
│   │   ├── HLSVideoPlayer.jsx
│   │   ├── CreateRoomModal.jsx
│   │   └── NotificationMenu.jsx
│   ├── admin/                # Admin dashboard components
│   └── config/
│       └── movieStreams.js   # Video streaming configuration
├── public/                   # Static assets
└── images/                   # Image assets
```

## Key Architectural Patterns

### Controller Organization

Controllers are split into domain-specific folders with an index file that exports all handlers:
- `controllers/{domain}/index.js` - Exports all handlers
- `controllers/{domain}/*.js` - Individual handler implementations

### Socket.io Event Naming

- `room:*` - Chat room events
- `message:*` - Chat messaging events
- `video-*` - Video playback sync events
- `watch:*` - Watch room specific events
- `playback:*` - Playback control permission events
- `user:*` - User presence events
- `typing:*` - Typing indicators

### API Route Structure

All API routes are prefixed with `/api/`:
- `/api/auth` - Authentication endpoints
- `/api/admin` - Admin operations
- `/api/movies` - Movie catalog
- `/api/chat` - Chat operations
- `/api/rooms` - Watch room management
- `/api/notifications` - Notification system

### Protected Routes

Frontend uses `ProtectedRoute` component wrapper that:
- Checks for JWT token in localStorage
- Verifies token with backend `/api/auth/me`
- Redirects to `/auth` if unauthorized

### Real-time Communication

Socket.io handles:
- Watch room video synchronization (play, pause, seek, heartbeat)
- Chat messaging (send, receive, typing indicators)
- User presence (online/offline status)
- Notifications (friend requests, invites)
- Playback control permissions

### Video Sync Architecture

See `docs/SYNC_ARCHITECTURE.md` for detailed sync implementation:
- Timestamp-based event ordering prevents race conditions
- Threshold-based drift correction (1.5s tolerance)
- Heartbeat monitoring every 7 seconds
- Buffered playback for synchronized starts
- Latency compensation for late joiners
