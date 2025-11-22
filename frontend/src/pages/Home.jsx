import { useState, useEffect } from 'react';
import { 
  Search,
  Bell,
  ChevronDown,
  Film,
  ArrowUp,
  Sparkles,
  Star,
  Globe,
  TrendingUp,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';

const Home = () => {
  const navigate = useNavigate();
  const [movieCategories, setMovieCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [userName, setUserName] = useState('User');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Movies');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Hero carousel data
  const heroSlides = [
      {
      id: 1,
      title: "Roi Roi Binale",
      subtitle: "The Ultimate Showdown",
      description: "An action-packed thriller that keeps you on the edge",
      image: "/images/movie-posters/roiroibinale.png",
      tags: ["2h 15min", "Action", "Movie", "2025", "13+"]
    },
    {
      id: 2,
      title: "How to Train Your Dragon",
      subtitle: "The Final Chapter",
      description: "Experience the epic conclusion of the beloved trilogy",
      image: "/images/movie-posters/image.png",
      tags: ["1h 56min", "Action", "Movie", "2025", "6+"]
    },
    {
      id: 3,
      title: "Padmavat",
      subtitle: "A Royal Saga",
      description: "Witness the legendary tale of honor and sacrifice",
      image: "/images/movie-posters/padmavat.png",
      tags: ["2h 44min", "Drama", "Movie", "2018", "13+"]
    }
  ];

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPersonalizedMovies = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          console.log('📝 No token found, loading default categories');
          const [trending, popular, action] = await Promise.all([
            MovieService.getMoviesByCategory('trending'),
            MovieService.getMoviesByCategory('popular'),
            MovieService.getMoviesByCategory('action'),
          ]);
          
          setMovieCategories([
            { title: 'Trending Now', movies: trending.movies || [] },
            { title: 'Popular Movies', movies: popular.movies || [] },
            { title: 'Action & Adventure', movies: action.movies || [] },
          ]);
          setLoading(false);
          return;
        }

        console.log('🎬 Fetching personalized movies from backend...');
        const response = await fetch('http://localhost:5000/api/movies/personalized', {
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
          // Set username
          if (data.userName) {
            setUserName(data.userName);
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
          const [trending, popular, action] = await Promise.all([
            MovieService.getMoviesByCategory('trending'),
            MovieService.getMoviesByCategory('popular'),
            MovieService.getMoviesByCategory('action'),
          ]);
          setMovieCategories([
            { title: 'Trending Now', movies: trending.movies || [] },
            { title: 'Popular Movies', movies: popular.movies || [] },
            { title: 'Action & Adventure', movies: action.movies || [] },
          ]);
        }
      } catch (error) {
        console.error('❌ Error fetching personalized movies:', error);
        // Fallback to default categories
        try {
          const [trending, popular, action] = await Promise.all([
            MovieService.getMoviesByCategory('trending'),
            MovieService.getMoviesByCategory('popular'),
            MovieService.getMoviesByCategory('action'),
          ]);
          setMovieCategories([
            { title: 'Trending Now', movies: trending.movies || [] },
            { title: 'Popular Movies', movies: popular.movies || [] },
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

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content Area */}
      <div>
        {/* Top Navigation Bar */}
        <div className="fixed top-0 right-0 left-20 h-20 bg-gradient-to-r from-black/60 via-black/50 to-black/60 backdrop-blur-2xl border-b border-gold/20 z-40 shadow-lg shadow-black/20">
          <div className="h-full px-8 flex items-center justify-between gap-6">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-gold/15 to-gold-light/10 hover:from-gold/20 hover:to-gold-light/15 rounded-xl border border-gold/30 transition-all shadow-lg shadow-gold/10">
                  <Film size={20} className="text-gold" />
                  <span className="text-white text-sm font-semibold">{filterType}</span>
                  <ChevronDown size={18} className="text-gold/60" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/50 group-hover:text-gold transition-colors" size={22} />
                <input
                  type="text"
                  placeholder="Search movies, series, shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-gold/20 rounded-2xl py-3.5 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 focus:bg-white/10 transition-all shadow-inner font-medium"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-3 bg-gradient-to-br from-gold/15 to-gold-light/10 hover:from-gold/20 hover:to-gold-light/15 rounded-xl border border-gold/30 transition-all shadow-lg shadow-gold/10"
              >
                <Bell size={22} className="text-gold" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
              </motion.button>

              {/* User Profile */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/myspace')}
                className="flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-gold/15 to-gold-light/10 hover:from-gold/20 hover:to-gold-light/15 rounded-xl border border-gold/30 transition-all shadow-lg shadow-gold/10"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-gold to-gold-light rounded-full flex items-center justify-center shadow-lg shadow-gold/30">
                  <span className="text-black font-bold text-base">{userName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-bold">{userName}</p>
                  <p className="text-gold text-xs font-semibold">Premium ✦</p>
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Hero Carousel Section */}
        <div className="pt-28 px-8 pb-4">
          <div className="relative h-[520px] group">
            {/* Slides */}
            <AnimatePresence mode="wait">
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
                      src={heroSlides[currentSlide].image}
                      alt={heroSlides[currentSlide].title}
                      className="w-full h-full object-cover"
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
                        {heroSlides[currentSlide].tags.map((tag, index) => (
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
                        {heroSlides[currentSlide].title}
                      </motion.h1>

                      {/* Subtitle */}
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl font-medium text-gold"
                      >
                        {heroSlides[currentSlide].subtitle}
                      </motion.p>

                      {/* Description */}
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-base text-white/90 leading-relaxed max-w-2xl"
                      >
                        {heroSlides[currentSlide].description}
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
            </AnimatePresence>

            {/* Navigation Dots */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {heroSlides.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
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

            {/* Navigation Arrows */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 z-20"
            >
              <ChevronDown size={24} className="rotate-90" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
              className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 z-20"
            >
              <ChevronDown size={24} className="-rotate-90" />
            </motion.button>

            {/* Slide Counter */}
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg text-white text-sm font-bold z-20">
              {currentSlide + 1} / {heroSlides.length}
            </div>
          </div>
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
            {movieCategories.map((category, idx) => {
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
                        category.movies.map((movie, movieIdx) => (
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
                        ))
                      ) : (
                        <div className="flex items-center justify-center w-full py-10">
                          <p className="text-white/40 text-lg">No movies available in this category</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
