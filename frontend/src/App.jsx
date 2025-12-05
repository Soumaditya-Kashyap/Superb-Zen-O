import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import WatchTogether from './pages/WatchTogether';
import Chat from './pages/Chat';
import Wish from './pages/Wish';
import Sparks from './pages/Sparks';
import Categories from './pages/Categories';
import CategoryMovies from './pages/CategoryMovies';
import TrendingList from './pages/TrendingList';
import MusicPage from './pages/MusicPage';
import Support from './pages/Support';
import SettingsPage from './pages/SettingsPage';
import MySpace from './pages/MySpace';
import MoviePlayer from './pages/MoviePlayer';
import Login from './pages/Login';
import Signup from './pages/Signup';

import AdminLogin from './admin/AdminLogin';
import AdminRegister from './admin/AdminRegister';
import AdminDashboard from './admin/AdminDashboard';


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
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? "flex-1 ml-20 w-[calc(100%-5rem)] bg-black" : "w-full flex justify-center items-center"}>
        <Routes>
          <Route path="/auth" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/signup" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Signup setIsAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Home /></ProtectedRoute>
          } />
          <Route path="/watch-together" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><WatchTogether /></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Chat /></ProtectedRoute>
          } />
          <Route path="/wish" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Wish /></ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Categories /></ProtectedRoute>
          } />
          <Route path="/category/:categoryName" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><CategoryMovies /></ProtectedRoute>
          } />
          <Route path="/trending" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><TrendingList /></ProtectedRoute>
          } />
          <Route path="/sparks" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Sparks /></ProtectedRoute>
          } />
          <Route path="/music" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><MusicPage /></ProtectedRoute>
          } />
          <Route path="/support" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><Support /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/myspace" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><MySpace /></ProtectedRoute>
          } />
          <Route path="/player/:imdbId" element={
            <ProtectedRoute setIsAuthenticated={setIsAuthenticated}><MoviePlayer /></ProtectedRoute>
          } />
          <Route path="*" element={
            <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
          } />
      
      
          {/* Admin Routes */}
          <Route path="/admin/login" element={
            <AdminLogin setIsAdminAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/admin/register" element={
            <AdminRegister setIsAdminAuthenticated={setIsAuthenticated} />
          } />
          <Route path="/admin/dashboard" element={
            isAuthenticated ? <AdminDashboard /> : <Navigate to="/admin/login" replace />
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
