---
inclusion: auto
---

# Tech Stack

## Frontend

- React 19.2.0 with React Router for navigation
- Vite 7.2.2 as build tool and dev server
- Tailwind CSS + PostCSS for styling
- Socket.io-client for real-time communication
- Axios for HTTP requests
- HLS.js for video streaming
- Framer Motion for animations
- Lucide React for icons

## Backend

- Node.js with Express 5.1.0
- MongoDB with Mongoose 8.20.0 for data persistence
- Socket.io 4.8.1 for WebSocket communication
- JWT (jsonwebtoken) for authentication
- bcryptjs for password hashing
- CORS enabled for cross-origin requests

## Development Tools

- ESLint for code linting
- nodemon for backend hot-reload during development

## Common Commands

### Backend

```bash
cd backend
npm start          # Start production server
npm run dev        # Start with nodemon (hot-reload)
```

### Frontend

```bash
cd frontend
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Database Setup

The backend connects to MongoDB Atlas. Ensure `.env` file exists in `backend/` with:
- `JWT_SECRET` for token signing
- MongoDB connection string
- Port configuration (default: 5000)

### Troubleshooting

**Port conflicts (Windows):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

**Missing dependencies:**
```bash
npm install
```

## Architecture Notes

- Monorepo structure with separate `frontend/` and `backend/` directories
- RESTful API endpoints under `/api/*` routes
- Socket.io for real-time features (chat, video sync, notifications)
- JWT tokens stored in localStorage on frontend
- Cookie-based authentication support via cookie-parser
