import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const getBackendUrl = () => {
  let url = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  return url.replace(/\/$/, ''); // Remove trailing slash
};

window.BACKEND_URL = getBackendUrl();
window.SOCKET_URL = window.BACKEND_URL;
window.API_BASE_URL = window.BACKEND_URL.endsWith('/api') ? window.BACKEND_URL : `${window.BACKEND_URL}/api`;

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
