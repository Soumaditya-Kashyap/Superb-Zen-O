import { useState, useEffect } from 'react';
import { 
  ChevronDown,
  ChevronRight,
  Film,
  ArrowUp,
  Sparkles,
  Star,
  Globe,
  TrendingUp,
  Heart,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';
import WatchModeModal from '../components/WatchModeModal';
import TopNavbar from '../components/TopNavbar';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || 'http://localhost:5000';




const Home = () => {
  const navigate = useNavigate();
  const [movieCategories, setMovieCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filterType, setFilterType] = useState('All Media');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showHeroWatchModal, setShowHeroWatchModal] = useState(false);
  const [selectedHeroMovie, setSelectedHeroMovie] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [slideResetKey, setSlideResetKey] = useState(0);

  // Fetch hero movies from database
  useEffect(() => {
    const fetchHeroMovies = async () => {
      try {
        setHeroLoading(true);
        console.log('🎬 Home: Fetching hero movies from database...');
        
        const response = await MovieService.getHeroMovies();
        console.log('📦 Home: Hero response received:', response);
        
        if (response && response.success && response.heroMovies && response.heroMovies.length > 0) {
          console.log(`✅ Home: Loaded ${response.heroMovies.length} hero movies`);
          console.log('🎬 Hero movies:', response.heroMovies.map(m => m.title));
          setHeroSlides(response.heroMovies);
        } else {
          console.log('⚠️  Home: No hero movies in response, using fallback');
          console.log('📦 Full response:', JSON.stringify(response, null, 2));
          // Fallback hero slides if database is empty
          setHeroSlides([
            {
              id: 1,
              title: "Welcome to Superb",
              subtitle: "Your Entertainment Hub",
              description: "Discover amazing movies and shows",
              image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920",
              tags: ["Movies", "Series", "Entertainment"],
              imdbID: null
            }
          ]);
        }
      } catch (error) {
        console.error('❌ Home: Error fetching hero movies:', error);
        // Set fallback on error
        setHeroSlides([
          {
            id: 1,
            title: "Welcome to Superb",
            subtitle: "Your Entertainment Hub", 
            description: "Discover amazing movies and shows",
            image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920",
            tags: ["Movies", "Series", "Entertainment"],
            imdbID: null
          }
        ]);
      } finally {
        setHeroLoading(false);
      }
    };

    fetchHeroMovies();
  }, []);

  // Auto-play carousel - 3 seconds per slide, resets on manual navigation
  useEffect(() => {
    if (heroSlides.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [heroSlides.length, slideResetKey]);

  // Function to handle manual slide change (resets timer)
  const handleSlideChange = (newSlide) => {
    if (typeof newSlide === 'function') {
      setCurrentSlide(newSlide);
    } else {
      setCurrentSlide(newSlide);
    }
    setSlideResetKey((prev) => prev + 1); // Reset the timer
  };

  useEffect(() => {
    const fetchPersonalizedMovies = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          console.log('📝 No token found, loading default categories');
          const [trending, comedy, action] = await Promise.all([
            MovieService.getMoviesByCategory('trending'),
            MovieService.getMoviesByCategory('comedy'),
            MovieService.getMoviesByCategory('action'),
          ]);
          
          setMovieCategories([
            { title: 'Trending Now', movies: trending.movies || [] },
            { title: 'Comedy Movies', movies: comedy.movies || [] },
            { title: 'Action & Adventure', movies: action.movies || [] },
          ]);
          setLoading(false);
          return;
        }

        console.log('🎬 Fetching personalized movies from backend...');
        const response = await fetch(`${API_URL}/api/movies/personalized`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          console.error('❌ HTTP Error:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Backend response:', data);

        if (data.success) {
          // Log username
          if (data.userName) {
            console.log('👤 Welcome back,', data.userName);
          }

          const categories = [];

          // Always add Trending first (from database)
          const trending = await MovieService.getMoviesByCategory('trending');
          categories.push({ 
            title: 'Trending Now', 
            movies: trending.movies || [],
            isPriority: true 
          });

          // Add ALL personalized categories from DATABASE (based on user's selected genres AND languages)
          if (data.personalizedMovies && data.personalizedMovies.length > 0) {
            console.log(`✅ Found ${data.personalizedMovies.length} personalized categories from DATABASE`);
            console.log(`🎯 User preferences - Genres: ${data.userPreferences?.genres?.join(', ')}, Languages: ${data.userPreferences?.languages?.join(', ')}`);
            
            data.personalizedMovies.forEach((item, index) => {
              if (item.movies && item.movies.length > 0) {
                // Database movies use different structure - map to consistent format
                const formattedMovies = item.movies.map(movie => ({
                  imdbID: movie.imdbID,
                  Title: movie.Title,
                  Year: movie.Year,
                  Poster: movie.Poster,
                  Type: movie.Type || 'movie',
                  Genre: movie.Genre,
                  imdbRating: movie.imdbRating,
                  Plot: movie.Plot
                }));
                
                // Check if this is a language category
                const isLanguageCategory = item.isLanguageCategory === true;
                const categoryTitle = isLanguageCategory ? item.displayName : `${item.displayName} - For You`;
                
                categories.push({
                  title: categoryTitle,
                  movies: formattedMovies,
                  isPersonalized: !isLanguageCategory,
                  isLanguageCategory: isLanguageCategory,
                  priority: index // Order by user's selection
                });
                
                const categoryType = isLanguageCategory ? '🌐 Language' : '🎭 Genre';
                console.log(`📽️  Added ${formattedMovies.length} ${item.genre} movies [${categoryType}] (Top rating: ${formattedMovies[0]?.imdbRating}⭐)`);
              }
            });

            // Add Popular at the end
            const popular = await MovieService.getMoviesByCategory('action');
            categories.push({ 
              title: 'Popular Action Movies', 
              movies: popular.movies || [] 
            });

            console.log(`🎉 Personalized dashboard loaded with ${data.personalizedMovies.length} custom categories!`);
          } else {
            console.log('⚠️  No personalized movies, loading default categories');
            const [popular, action, comedy] = await Promise.all([
              MovieService.getMoviesByCategory('comedy'),
              MovieService.getMoviesByCategory('action'),
              MovieService.getMoviesByCategory('romance'),
            ]);
            categories.push({ title: 'Comedy Movies', movies: popular.movies || [] });
            categories.push({ title: 'Action Movies', movies: action.movies || [] });
            categories.push({ title: 'Romance Movies', movies: comedy.movies || [] });
          }

          setMovieCategories(categories);
        } else {
          console.log('❌ Failed to fetch personalized movies');
          // Fallback to default
          const [trending, comedy, action] = await Promise.all([
            MovieService.getMoviesByCategory('trending'),
            MovieService.getMoviesByCategory('comedy'),
            MovieService.getMoviesByCategory('action'),
          ]);
          setMovieCategories([
            { title: 'Trending Now', movies: trending.movies || [] },
            { title: 'Comedy Movies', movies: comedy.movies || [] },
            { title: 'Action & Adventure', movies: action.movies || [] },
          ]);
        }
      } catch (error) {
        console.error('❌ Error fetching personalized movies:', error);
        // Fallback to default categories
        try {
          const [trending, comedy, action] = await Promise.all([
            MovieService.getMoviesByCategory('trending'),
            MovieService.getMoviesByCategory('comedy'),
            MovieService.getMoviesByCategory('action'),
          ]);
          setMovieCategories([
            { title: 'Trending Now', movies: trending.movies || [] },
            { title: 'Comedy Movies', movies: comedy.movies || [] },
            { title: 'Action & Adventure', movies: action.movies || [] },
          ]);
        } catch (fallbackError) {
          console.error('❌ Fallback failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalizedMovies();
  }, []);

  // Scroll detection for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie.imdbID);
  };

  const handleCloseDetails = () => {
    setSelectedMovie(null);
  };

  const handleHeroWatchNow = (slide) => {
    setSelectedHeroMovie(slide);
    setShowHeroWatchModal(true);
  };

  const handleHeroWatchMode = (mode) => {
    setShowHeroWatchModal(false);
    if (mode === 'alone' && selectedHeroMovie) {
      navigate(`/player/${selectedHeroMovie.imdbID}`);
    } else if (selectedHeroMovie) {
      const moviePayload = {
        imdbID: selectedHeroMovie.imdbID,
        Title: selectedHeroMovie.title,
        Poster: selectedHeroMovie.image,
        videoFolderName: selectedHeroMovie.imdbID
      };
      navigate('/watch-together', {
        state: {
          youtubeMovie: moviePayload
        }
      });
    }
  };

  // Handle filter change from TopNavbar
  const handleFilterChange = (filter) => {
    setFilterType(filter);
    
    if (filter === 'All Media') {
      setFilteredCategories(movieCategories);
      return;
    }

    // Filter movies based on selected filter
    const filterLower = filter.toLowerCase();
    const filtered = movieCategories.map(category => {
      const filteredMovies = category.movies.filter(movie => {
        const genre = (movie.Genre || '').toLowerCase();
        const type = (movie.Type || '').toLowerCase();
        // fallback logic for missing Type field.
        if (filter === 'Movies') return type === 'movie';
        if (filter === 'Series') return type === 'series';
        
        // Genre filters
        return genre.includes(filterLower);
      });
      
      return {
        ...category,
        movies: filteredMovies
      };
    }).filter(category => category.movies.length > 0);

    setFilteredCategories(filtered);
  };

  // Update filtered categories when movie categories change
  useEffect(() => {
    setFilteredCategories(movieCategories);
  }, [movieCategories]);

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content Area */}
      <div>
        {/* Top Navigation Bar */}
         <TopNavbar 
           showBackButton={false} 
           onFilterChange={handleFilterChange}
           onMovieSelect={(imdbId) => setSelectedMovie(imdbId)}
           currentFilter={filterType}
         />

        {/* Hero Carousel Section */}
        <div className="pt-28 px-8 pb-4">
          {heroLoading ? (
            // Hero Loading State
            <div className="relative h-[520px] rounded-3xl overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
                  <p className="text-white/60 text-lg">Loading featured movies...</p>
                </div>
              </div>
            </div>
          ) : heroSlides.length === 0 ? (
            // No Hero Movies State
            <div className="relative h-[520px] rounded-3xl overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/60 text-lg">No featured movies available</p>
              </div>
            </div>
          ) : (
          <div className="relative h-[520px] group">
            {/* Slides */}
            <AnimatePresence mode="wait">
              {heroSlides[currentSlide] && (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {/* Glassmorphic Frame Container */}
                <div className="relative h-full w-full rounded-3xl overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border-4 border-white/20 shadow-2xl">
                  {/* Movie Poster - Full visibility */}
                  <div className="absolute inset-0">
                    <img 
                      src={heroSlides[currentSlide]?.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920'}
                      alt={heroSlides[currentSlide]?.title || 'Featured Movie'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('❌ Hero image failed to load:', heroSlides[currentSlide]?.image);
                        e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920';
                      }}
                    />
                    {/* Subtle gradient only at bottom for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  </div>

                  {/* Content positioned at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-10 pb-12">
                    <div className="max-w-3xl space-y-4">
                      {/* Tags */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        {(heroSlides[currentSlide]?.tags || []).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-white/15 backdrop-blur-md border border-white/30 rounded-lg text-white text-xs font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </motion.div>

                      {/* Title - Smaller and cleaner */}
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl font-bold text-white leading-tight drop-shadow-2xl"
                      >
                        {heroSlides[currentSlide]?.title || 'Featured Movie'}
                      </motion.h1>

                      {/* Subtitle */}
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl font-medium text-gold"
                      >
                        {heroSlides[currentSlide]?.subtitle || ''}
                      </motion.p>

                      {/* Description */}
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-base text-white/90 leading-relaxed max-w-2xl"
                      >
                        {heroSlides[currentSlide]?.description || ''}
                      </motion.p>

                      {/* Buttons */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-3 pt-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleHeroWatchNow(heroSlides[currentSlide])}
                          className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-black font-bold text-base rounded-xl shadow-lg shadow-gold/40 hover:shadow-gold/60 transition-all flex items-center gap-2"
                        >
                          <Film size={18} />
                          Watch Now
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-6 py-3 bg-white/15 backdrop-blur-md border-2 border-white/30 text-white font-semibold text-base rounded-xl hover:bg-white/25 transition-all flex items-center gap-2"
                        >
                          <Heart size={18} />
                          Add to Favorites
                        </motion.button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Dots */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {heroSlides.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleSlideChange(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`transition-all duration-500 rounded-full ${
                    index === currentSlide
                      ? 'w-10 h-2.5 bg-gradient-to-r from-gold to-gold-light shadow-md shadow-gold/50'
                      : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows - Hidden by default, visible on hover */}
            <button
              onClick={() => handleSlideChange((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20"
            >
              <ChevronDown size={24} className="rotate-90" />
            </button>
            <button
              onClick={() => handleSlideChange((prev) => (prev + 1) % heroSlides.length)}
              className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20"
            >
              <ChevronDown size={24} className="-rotate-90" />
            </button>

            {/* Slide Counter */}
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg text-white text-sm font-bold z-20">
              {currentSlide + 1} / {heroSlides.length}
            </div>
          </div>
          )}
        </div>

        {/* Movie Content */}
        <div className="px-8 py-8">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold w-6 h-6" />
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 mt-6 text-lg font-medium"
            >
              Loading your personalized movies...
            </motion.p>
            
            {/* Loading Skeleton */}
            <div className="w-full max-w-6xl mt-12 space-y-8">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="space-y-4"
                >
                  <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse"></div>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="flex-none w-[200px] h-[350px] bg-white/5 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category, idx) => {
              // Determine icon based on category title
              const getCategoryIcon = (title) => {
                if (title.includes('Trending')) return <TrendingUp className="text-gold" size={24} />;
                if (title.includes('Popular')) return <Star className="text-gold" size={24} />;
                if (title.includes('For You')) return <Heart className="text-gold" size={24} />;
                if (title.includes('Movies') && !title.includes('For You')) return <Globe className="text-gold" size={24} />; // Language categories
                return <Sparkles className="text-gold" size={24} />;
              };

              const isPersonalized = category.title.includes('For You');
              const isLanguageCategory = category.isLanguageCategory || (category.title.includes('Movies') && !category.title.includes('For You'));

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="mb-10"
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-6">
                    {getCategoryIcon(category.title)}
                    <h2 className="text-3xl font-bold text-white">{category.title}</h2>
                    {isPersonalized && (
                      <span className="px-3 py-1 bg-gold/20 text-gold border border-gold/30 rounded-full text-xs font-medium">
                        Personalized
                      </span>
                    )}
                    {isLanguageCategory && (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium flex items-center gap-1">
                        <Globe size={12} />
                        Language
                      </span>
                    )}
                    {category.movies && category.movies.length > 0 && (
                      <span className="text-white/40 text-sm ml-auto">
                        {category.movies.length} movies
                      </span>
                    )}
                  </div>

                  {/* Movies Horizontal Scroll */}
                  <div className="relative group">
                    {/* Gradient Overlays for scroll indication */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gold/30 scrollbar-track-transparent hover:scrollbar-thumb-gold/50 transition-all">
                      {category.movies && category.movies.length > 0 ? (
                        <>
                          {category.movies.map((movie, movieIdx) => (
                            <motion.div 
                              key={movie.imdbID}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 + movieIdx * 0.02, duration: 0.3 }}
                              whileHover={{ scale: 1.05, y: -8, transition: { duration: 0.2 } }}
                              className="flex-none w-[200px]"
                            >
                              <MovieCard 
                                movie={movie} 
                                onClick={handleMovieClick}
                                isPersonalized={category.isPersonalized}
                              />
                            </motion.div>
                          ))}
                          
                          {/* View More / View Full List Card */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05, y: -8, transition: { duration: 0.2 } }}
                            onClick={() => {
                              // Check if this is the Trending category
                              if (category.title.includes('Trending')) {
                                navigate('/trending');
                              } else {
                                // Determine category type and navigate
                                const categorySlug = category.genre || category.title.replace(/ - For You$/, '').replace(/ Movies$/, '').trim();
                                const categoryType = category.isLanguageCategory ? 'language' : 
                                                     category.isPersonalized ? 'genre' : 'category';
                                navigate(`/category/${encodeURIComponent(categorySlug)}?title=${encodeURIComponent(category.title)}&type=${categoryType}`);
                              }
                            }}
                            className="flex-none w-[200px] h-[350px] bg-gradient-to-br from-gold/20 via-gold/10 to-transparent border-2 border-gold/30 hover:border-gold/60 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group/viewmore"
                          >
                            <div className="w-16 h-16 rounded-full bg-gold/20 group-hover/viewmore:bg-gold/30 flex items-center justify-center mb-4 transition-all">
                              <ArrowRight className="w-8 h-8 text-gold group-hover/viewmore:translate-x-1 transition-transform" />
                            </div>
                            <span className="text-gold font-bold text-lg">
                              {category.title.includes('Trending') ? 'View Full List' : 'View More'}
                            </span>
                            <span className="text-gold/60 text-sm mt-1 text-center px-4">
                              {category.title.includes('Trending') ? 'See top 30 trending' : 'See all movies'}
                            </span>
                          </motion.div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center w-full py-10">
                          <p className="text-white/40 text-lg">No movies available in this category</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <p className="text-white/60 text-lg">No movies found for "{filterType}" filter</p>
                <button 
                  onClick={() => handleFilterChange('All Media')}
                  className="mt-4 px-6 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors"
                >
                  Clear Filter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetails 
          imdbId={selectedMovie} 
          onClose={handleCloseDetails}
        />
      )}

      {/* Hero Watch Mode Modal */}
      <WatchModeModal 
        isOpen={showHeroWatchModal}
        onClose={() => setShowHeroWatchModal(false)}
        onSelectMode={handleHeroWatchMode}
        movieTitle={selectedHeroMovie?.title || ''}
      />

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-gold to-gold-light text-black shadow-2xl shadow-gold/30 flex items-center justify-center hover:shadow-gold/50 transition-shadow"
          >
            <ArrowUp size={24} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
      </div>
   
    </div>
  );
};

export default Home;