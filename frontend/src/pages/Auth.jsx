import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || 'http://localhost:5000';

const Auth = ({ setIsAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Login successful! Redirecting...');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setTimeout(() => navigate('/'), 500);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center px-8 lg:px-16 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-white/60">Sign in to continue watching together</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-6 mb-8">
            <div className="pb-3 px-2 text-base font-semibold border-b-2 border-gold text-gold">
              Login
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="pb-3 px-2 text-base font-semibold transition-all duration-300 border-b-2 border-transparent text-white/40 hover:text-white/60"
            >
              Sign Up
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm mb-5 bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-lg text-sm mb-5 bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              {success}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    required
                    placeholder="Enter your email"
                    className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    required
                    placeholder="Enter your password"
                    className="w-full py-3.5 pl-12 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-light text-black text-base font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-gold/30 disabled:opacity-60 disabled:cursor-not-allowed mt-6"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
          </form>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-gray-900 via-black to-black items-center justify-center px-16 py-12">
        <div className="w-full max-w-2xl flex flex-col items-center justify-center">
          {/* Logo at top center */}
          <div className="text-center mb-10">
            <img 
              src="/images/appLogo/superb-light.png" 
              alt="Superb Logo" 
              className="h-20 mx-auto mb-3"
            />
            <p className="text-gold text-sm font-medium tracking-widest">SHARING EMOTION TOGETHER</p>
          </div>

          {/* Glassmorphic Card with Image */}
          <div className="w-full">
            <div className="glass-effect-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src="/images/authScene/3942584.jpg"
                alt="Your Friends Are Waiting" 
                className="w-full h-[380px] object-cover"
              />
            </div>
            
            {/* Text Below Image */}
            <div className="mt-8 text-center">
              <h3 className="text-3xl font-bold text-white mb-4">Your Friends Are Waiting</h3>
              <p className="text-base text-white/70 leading-relaxed">
                Remember those movie nights? Your friends might be watching right now. Come back and relive the magic of watching together. Synchronized playback, live reactions, and endless memories await.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Auth.propTypes = {
  setIsAuthenticated: PropTypes.func.isRequired,
};

export default Auth;