import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import TV from './pages/TV';
import Movies from './pages/Movies';
import Sports from './pages/Sports';
import Sparks from './pages/Sparks';
import Categories from './pages/Categories';
import MySpace from './pages/MySpace';
import Auth from './pages/Auth';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children, setIsAuthenticated }) {
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
    }
  }, [token, setIsAuthenticated]);
  
  return token ? children : <Navigate to="/auth" replace />;
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      // Verify token with backend
      fetch('http://localhost:5000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Re-check authentication when location changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isAuthenticated) {
      checkAuth();
    }
  }, [location]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#000'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app">
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? "main-content" : ""}>
        <Routes>
          <Route path="/auth" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Auth setIsAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Home /></ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Search /></ProtectedRoute>
          } />
          <Route path="/tv" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><TV /></ProtectedRoute>
          } />
          <Route path="/movies" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Movies /></ProtectedRoute>
          } />
          <Route path="/sports" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Sports /></ProtectedRoute>
          } />
          <Route path="/sparks" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Sparks /></ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Categories /></ProtectedRoute>
          } />
          <Route path="/myspace" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><MySpace /></ProtectedRoute>
          } />
          <Route path="*" element={
            <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
