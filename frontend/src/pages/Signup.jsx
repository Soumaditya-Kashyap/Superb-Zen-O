import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {  AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const Signup = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    nickName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    languages: [],
    genres: []
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const totalSteps = 6;

  // Indian languages first, then others
  const languages = [
    'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam',
    'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Italian', 
    'Portuguese', 'Russian', 'Arabic', 'Turkish'
  ];

  const genres = [
    { id: 'action', name: 'Action', image: 'https://images.unsplash.com/photo-1574267432644-f74e8cee3dd3?w=200&h=200&fit=crop' },
    { id: 'romance', name: 'Romance', image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=200&fit=crop' },
    { id: 'comedy', name: 'Comedy', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=200&h=200&fit=crop' },
    { id: 'thriller', name: 'Thriller', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop' },
    { id: 'horror', name: 'Horror', image: 'https://images.unsplash.com/photo-1603513492128-ba7bc9b3e143?w=200&h=200&fit=crop' },
    { id: 'scifi', name: 'Sci-Fi', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&h=200&fit=crop' },
    { id: 'drama', name: 'Drama', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&h=200&fit=crop' },
    { id: 'animation', name: 'Animation', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&h=200&fit=crop' },
    { id: 'documentary', name: 'Documentary', image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200&h=200&fit=crop' },
    { id: 'fantasy', name: 'Fantasy', image: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=200&h=200&fit=crop' },
    { id: 'mystery', name: 'Mystery', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=200&fit=crop' },
    { id: 'family', name: 'Family', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=200&h=200&fit=crop' }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };
  // ⭐ FIXED PHONE HANDLER — ONLY DIGITS, MAX 10 ⭐
  const handlePhoneInput = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, ""); // remove non-digits
    if (digitsOnly.length <= 10) {
      setFormData(prev => ({ ...prev, phone: digitsOnly }));
    }
    setError("");
  };

  const toggleLanguage = (lang) => {
    setFormData(prev => {
      const isSelected = prev.languages.includes(lang);
      if (isSelected) {
        return { ...prev, languages: prev.languages.filter(l => l !== lang) };
      } else {
        // Max 5 languages
        if (prev.languages.length >= 5) {
          setError('You can select maximum 5 languages');
          return prev;
        }
        return { ...prev, languages: [...prev.languages, lang] };
      }
    });
  };

  const toggleGenre = (genreId) => {
    setFormData(prev => {
      const isSelected = prev.genres.includes(genreId);
      if (isSelected) {
        return { ...prev, genres: prev.genres.filter(g => g !== genreId) };
      } else {
        // Max 5 genres
        if (prev.genres.length >= 5) {
          setError('You can select maximum 5 genres');
          return prev;
        }
        return { ...prev, genres: [...prev.genres, genreId] };
      }
    });
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          setError('Please enter your full name');
          return false;
        }
        if (!formData.nickName.trim()) {
          setError('Please enter a nickname');
          return false;
        }
        break;
      case 2:
        if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (!formData.phone.trim() || formData.phone.length < 10) {
          setError('Please enter a valid phone number');
          return false;
        }
        break;
      case 3:
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        break;
      case 4:
        if (formData.languages.length === 0) {
          setError('Please select at least one language');
          return false;
        }
        break;
      case 5:
        if (formData.genres.length === 0) {
          setError('Please select at least one genre');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        navigate('/');
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

  // Check if we're on full-screen steps (language/genre selection)
  const isFullScreen = currentStep === 4 || currentStep === 5;

  const renderStep = () => {

    switch (currentStep) {
      case 1:
        return (
          <motion.div 
            key="step-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 w-full"
          >
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">Can I know your name?</h3>
              <p className="text-white/60">Let's start with the basics</p>
            </div>
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Nickname</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="text"
                  value={formData.nickName}
                  onChange={(e) => handleChange('nickName', e.target.value)}
                  placeholder="Choose a nickname"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            key="step-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 w-full"
          >
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">Contact Information</h3>
              <p className="text-white/60">How can we reach you?</p>
            </div>
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                 <input
                  type="text"
                  value={formData.phone}
                  onChange={handlePhoneInput}
                  placeholder="Enter your 10 digit phone number"
                  inputMode="numeric"
                  maxLength={10}
                  className="w-full py-3.5 pl-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                />
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div 
            key="step-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 w-full"
          >
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">Secure Your Account</h3>
              <p className="text-white/60">Create a strong password</p>
            </div>
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Create a password (min 6 chars)"
                  className="w-full py-3.5 pl-12 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                  autoFocus
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
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full py-3.5 pl-12 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-gold focus:bg-white/8"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div 
            key="step-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <h3 className="text-4xl font-bold text-white mb-3">In which language would you like to watch movies?</h3>
              <p className="text-white/60 text-lg">Select one or more (Maximum 5)</p>
              <p className="text-gold text-sm mt-2">{formData.languages.length}/5 selected</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
              {languages.map((lang, index) => {
                const isSelected = formData.languages.includes(lang);
                const isDisabled = !isSelected && formData.languages.length >= 5;
                
                return (
                  <motion.button
                    key={lang}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.3 }}
                    onClick={() => !isDisabled && toggleLanguage(lang)}
                    disabled={isDisabled}
                    whileHover={{ scale: isDisabled ? 1 : 1.03 }}
                    whileTap={{ scale: isDisabled ? 1 : 0.97 }}
                    className={`
                      relative py-4 px-6 rounded-xl text-base font-semibold transition-all duration-200
                      ${isSelected 
                        ? 'bg-gradient-to-r from-gold to-gold-light text-black shadow-lg shadow-gold/30' 
                        : isDisabled
                        ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-white/5 border border-white/10 text-white hover:border-gold/50 hover:bg-white/10'
                      }
                    `}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-2 right-2"
                      >
                        <Check size={18} />
                      </motion.div>
                    )}
                    {lang}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div 
            key="step-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <h3 className="text-4xl font-bold text-white mb-3">What genres do you love?</h3>
              <p className="text-white/60 text-lg">Pick your favorites (Maximum 5)</p>
              <p className="text-gold text-sm mt-2">{formData.genres.length}/5 selected</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 max-w-7xl mx-auto">
              {genres.map((genre, index) => {
                const isSelected = formData.genres.includes(genre.id);
                const isDisabled = !isSelected && formData.genres.length >= 5;
                
                return (
                  <motion.button
                    key={genre.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    onClick={() => !isDisabled && toggleGenre(genre.id)}
                    disabled={isDisabled}
                    whileHover={{ scale: isDisabled ? 1 : 1.03, y: isDisabled ? 0 : -4 }}
                    whileTap={{ scale: isDisabled ? 1 : 0.97 }}
                    className={`
                      relative rounded-2xl overflow-hidden transition-all duration-200
                      ${isSelected 
                        ? 'ring-4 ring-gold shadow-xl shadow-gold/30' 
                        : isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:ring-2 hover:ring-gold/50'
                      }
                    `}
                  >
                    <div className="aspect-square relative">
                      <img 
                        src={genre.image} 
                        alt={genre.name}
                        className="w-full h-full object-cover"
                      />
                      <div className={`
                        absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent
                        flex items-end justify-center pb-4
                      `}>
                        <span className="text-white font-bold text-lg">{genre.name}</span>
                      </div>
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-3 right-3 bg-gold rounded-full p-2"
                        >
                          <Check className="text-black" size={20} />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div 
            key="step-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-center space-y-6 w-full"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-gold to-gold-light rounded-full flex items-center justify-center mx-auto">
              <Check size={40} className="text-black" />
            </div>
            <h3 className="text-3xl font-bold text-white">All Set!</h3>
            <p className="text-white/70 text-lg max-w-md mx-auto">
              You've completed the setup. Click below to create your account and start watching together!
            </p>
            <div className="space-y-3 text-left max-w-md mx-auto bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Name:</span>
                <span className="text-white font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Email:</span>
                <span className="text-white font-medium">{formData.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Languages:</span>
                <span className="text-white font-medium">{formData.languages.length} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Genres:</span>
                <span className="text-white font-medium">{formData.genres.length} selected</span>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <div className={`min-h-screen ${isFullScreen ? '' : 'grid lg:grid-cols-2'}`}>
        {/* Left Side - Form */}
        <motion.div 
          className="flex items-center justify-center px-8 lg:px-16 py-12 relative z-10"
          initial={false}
          animate={{
            width: isFullScreen ? '100%' : 'auto'
          }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={`w-full transition-all duration-300 ${isFullScreen ? 'max-w-7xl' : 'max-w-lg'}`}>
            {/* Progress Bar */}
            {!isFullScreen && (
              <motion.div 
                className="mb-10"
                initial={false}
                animate={{ opacity: 1 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/60 text-sm font-medium">Step {currentStep} of {totalSteps}</span>
                  <span className="text-gold text-sm font-bold">{Math.round((currentStep / totalSteps) * 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full"
                    initial={false}
                    animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </motion.div>
            )}

            {/* Full-screen progress for language/genre steps */}
            {isFullScreen && (
              <motion.div 
                className="mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex justify-center items-center gap-2 mb-4">
                  {[...Array(totalSteps)].map((_, index) => (
                    <motion.div 
                      key={index}
                      initial={false}
                      animate={{
                        width: index + 1 <= currentStep ? 48 : 32,
                        backgroundColor: index + 1 <= currentStep ? '#D4AF37' : 'rgba(255, 255, 255, 0.2)'
                      }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
                <p className="text-center text-white/40 text-sm">Step {currentStep} of {totalSteps}</p>
              </motion.div>
            )}

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 py-3 rounded-xl text-sm mb-5 bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></div>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <motion.div 
              className={`flex ${currentStep === 1 ? 'justify-end' : 'justify-between'} gap-4 ${isFullScreen ? 'mt-10' : 'mt-6'}`}
              initial={false}
            >
              {currentStep > 1 && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleBack}
                  className="px-6 py-3.5 bg-white/5 border border-white/10 text-white rounded-lg transition-all duration-300 hover:bg-white/10 flex items-center gap-2 font-semibold"
                >
                  <ChevronLeft size={20} />
                  Back
                </motion.button>
              )}
              <button
                onClick={handleNext}
                disabled={loading}
                className={`${currentStep === 1 ? 'w-full' : 'flex-1'} py-3.5 bg-gradient-to-r from-gold to-gold-light text-black text-base font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-gold/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading ? 'Creating Account...' : currentStep === totalSteps ? 'Create Account' : 'Next'}
                {!loading && currentStep < totalSteps && <ChevronRight size={20} />}
              </button>
            </motion.div>

            {/* Back to Login Link */}
            {!isFullScreen && (
              <p className="text-center text-white/60 text-sm mt-6">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/auth')}
                  className="text-gold font-semibold hover:underline transition-all"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </motion.div>

        {/* Right Side - Image (Hidden on steps 4 & 5) */}
        {!isFullScreen && (
          <AnimatePresence mode="wait">
            <motion.div 
              key="right-panel"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="hidden lg:flex relative bg-gradient-to-br from-gray-900 via-black to-black items-center justify-center px-16 py-12"
            >
              <div className="w-full max-w-2xl flex flex-col items-center justify-center">
                {/* Logo */}
                <div className="text-center mb-10">
                  <img 
                    src="/images/appLogo/superb-light.png" 
                    alt="Superb Logo" 
                    className="h-20 mx-auto mb-3"
                  />
                  <p className="text-gold text-sm font-medium tracking-widest">SHARING EMOTION TOGETHER</p>
                </div>

                {/* Image Card */}
                <div className="w-full">
                  <div className="glass-effect-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <img 
                      src="/images/authScreen/3942584.jpg"
                      alt="Start Your Journey" 
                      className="w-full h-[380px] object-cover"
                    />
                  </div>
                  
                  <div className="mt-8 text-center">
                    <h3 className="text-3xl font-bold text-white mb-4">Start Your Journey</h3>
                    <p className="text-base text-white/70 leading-relaxed">
                      Join a community where distance doesn't matter. Watch movies, share laughs in real-time, and create unforgettable moments with friends worldwide.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

Signup.propTypes = {
  setIsAuthenticated: PropTypes.func.isRequired,
};

export default Signup;
