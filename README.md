# Superb - Collaborative Movie Watching Platform

Watch movies together with friends in real-time with synchronized playback and video calls.

---

## Quick Setup

### Prerequisites
- Node.js (v18+)
- Git

### Installation

1. Clone and navigate:
```bash
git clone https://github.com/Soumaditya-Kashyap/Superb-Zen-O.git
cd Superb-Zen-O
git checkout rakibul
```

2. Install dependencies:

**Backend:**
```bash
cd backend
npm install express@5.1.0 cors@2.8.5 dotenv@17.2.3 mongoose@8.20.0
```

**Frontend:**
```bash
cd frontend
npm install react@19.2.0 react-dom@19.2.0 react-router-dom react-icons prop-types
npm install -D vite@7.2.2 @vitejs/plugin-react
```

3. Check `.env` file exists in `backend/` folder (already configured)

---

## Running the App

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

---

## Tech Stack
- React 19 + Vite
- Node.js + Express
- MongoDB Atlas
- OMDb API

---

## Troubleshooting

**Port already in use:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

**Dependencies missing:**
```bash
npm install
```

---

## Important
- DO NOT commit `.env` files
- DO NOT share MongoDB credentials
- Always pull before starting work: `git pull origin rakibul`
