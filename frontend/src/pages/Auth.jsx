import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const Auth = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    nickName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Registration successful! Redirecting...');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setTimeout(() => navigate('/'), 500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-black via-gray-900 to-black p-5">
      <div className="w-full max-w-md glass-effect-dark rounded-3xl p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gold-gradient mb-2.5 tracking-[4px]">
            SUPERB
          </h1>
          <p className="text-white/60 text-sm tracking-wider">Watch Together, Anywhere</p>
        </div>

        <div className="flex gap-2.5 mb-8 bg-white/5 p-1.5 rounded-xl">
          <button
            className={`flex-1 py-3 px-4 rounded-lg text-base font-medium cursor-pointer transition-all duration-300 ${
              isLogin 
                ? 'bg-gradient-to-br from-gold to-gold-light text-black font-semibold' 
                : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => {
              setIsLogin(true);
              setError('');
              setSuccess('');
            }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-3 px-4 rounded-lg text-base font-medium cursor-pointer transition-all duration-300 ${
              !isLogin 
                ? 'bg-gradient-to-br from-gold to-gold-light text-black font-semibold' 
                : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => {
              setIsLogin(false);
              setError('');
              setSuccess('');
            }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-center mb-5 font-medium bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-xl text-sm text-center mb-5 font-medium bg-green-500/10 border border-green-500/30 text-green-400">
            {success}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Email</label>
              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                required
                placeholder="Enter your email"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Password</label>
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
                placeholder="Enter your password"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <button 
              type="submit" 
              className="py-3.5 px-4 bg-gradient-to-br from-gold to-gold-light border-none rounded-xl text-black text-base font-semibold cursor-pointer transition-all duration-300 mt-2.5 tracking-wider hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Full Name</label>
              <input
                type="text"
                name="name"
                value={registerData.name}
                onChange={handleRegisterChange}
                required
                placeholder="Enter your full name"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Email</label>
              <input
                type="email"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                required
                placeholder="Enter your email"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Nickname</label>
              <input
                type="text"
                name="nickName"
                value={registerData.nickName}
                onChange={handleRegisterChange}
                required
                placeholder="Choose a nickname"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={registerData.phone}
                onChange={handleRegisterChange}
                required
                placeholder="Enter your phone number"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Password</label>
              <input
                type="password"
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
                minLength={6}
                placeholder="Create a password (min 6 characters)"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-gold text-sm font-medium tracking-wider">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                required
                minLength={6}
                placeholder="Confirm your password"
                className="py-3.5 px-4 bg-white/5 border border-gold/20 rounded-xl text-white text-[15px] transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)] placeholder:text-white/30"
              />
            </div>

            <button 
              type="submit" 
              className="py-3.5 px-4 bg-gradient-to-br from-gold to-gold-light border-none rounded-xl text-black text-base font-semibold cursor-pointer transition-all duration-300 mt-2.5 tracking-wider hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

Auth.propTypes = {
  setIsAuthenticated: PropTypes.func.isRequired,
};

export default Auth;
