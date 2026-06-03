import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Film, 
  Loader, 
  Grid3X3, 
  LayoutGrid,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Star,
  Calendar,
  Clock
} from 'lucide-react';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';
import TopNavbar from '../components/TopNavbar';

const CategoryMovies = () => {
  const { categoryName } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get category info from URL params
  const categoryTitle = searchParams.get('title') || decodeURIComponent(categoryName || '');
  const categoryType = searchParams.get('type') || 'category'; // 'category', 'genre', 'language'
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalMovies, setTotalMovies] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'large'
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'year', 'title'
  const [showSortMenu, setShowSortMenu] = useState(false);

  const MOVIES_PER_PAGE = 24;

  // Fetch movies from database
  const fetchMovies = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Build the API URL based on category type
      let apiUrl = `window.API_BASE_URL/movies/category/${encodeURIComponent(categoryName)}`;
      apiUrl += `?page=${pageNum}&limit=${MOVIES_PER_PAGE}&sort=${sortBy}`;
      
      if (categoryType === 'genre') {
        apiUrl = `window.API_BASE_URL/movies/genre/${encodeURIComponent(categoryName)}`;
        apiUrl += `?page=${pageNum}&limit=${MOVIES_PER_PAGE}&sort=${sortBy}`;
      } else if (categoryType === 'language') {
        apiUrl = `window.API_BASE_URL/movies/language/${encodeURIComponent(categoryName)}`;
        apiUrl += `?page=${pageNum}&limit=${MOVIES_PER_PAGE}&sort=${sortBy}`;
      }

      console.log(`📽️ Fetching ${categoryType} movies:`, apiUrl);

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success) {
        const newMovies = data.movies || [];
        
        if (append) {
          setMovies(prev => [...prev, ...newMovies]);
        } else {
          setMovies(newMovies);
        }
        
        setTotalMovies(data.totalResults || newMovies.length);
        setHasMore(newMovies.length === MOVIES_PER_PAGE);
        
        console.log(`✅ Loaded ${newMovies.length} movies (Total: ${data.totalResults})`);
      } else {
        console.error('❌ Failed to fetch movies:', data.error);
        if (!append) {
          setMovies([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Error fetching movies:', error);
      if (!append) {
        setMovies([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryName, categoryType, sortBy]);

  // Initial fetch
  useEffect(() => {
    setPage(1);
    setMovies([]);
    fetchMovies(1, false);
  }, [categoryName, sortBy]);

  // Load more movies
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(nextPage, true);
    }
  };

  // Handle movie click
  const handleMovieClick = (movie) => {
    setSelectedMovie(movie.imdbID);
  };

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setShowSortMenu(false);
  };

  // Sort options
  const sortOptions = [
    { value: 'rating', label: 'Highest Rated', icon: Star },
    { value: 'year', label: 'Newest First', icon: Calendar },
    { value: 'title', label: 'Alphabetical', icon: Film },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation */}
      <TopNavbar />

      {/* Main Content */}
      <div className="pt-24 px-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>

            {/* Category Title */}
            <div>
              <div className="flex items-center gap-3">
                <Film className="w-8 h-8 text-gold" />
                <h1 className="text-3xl font-bold text-white">{categoryTitle}</h1>
              </div>
              <p className="text-white/50 text-sm mt-1 ml-11">
                {totalMovies > 0 ? `${totalMovies} movies available` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4 text-gold" />
                <span className="text-white text-sm">
                  {sortOptions.find(s => s.value === sortBy)?.label}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl"
                  >
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          sortBy === option.value 
                            ? 'bg-gold/20 text-gold' 
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white/10 rounded-xl border border-white/10 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-gold text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('large')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'large' ? 'bg-gold text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full"></div>
              <Film className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold w-6 h-6" />
            </motion.div>
            <p className="text-white/60 mt-6 text-lg">Loading {categoryTitle} movies...</p>
          </div>
        ) : movies.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32">
            <Film className="w-20 h-20 text-white/20 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">No Movies Found</h3>
            <p className="text-white/50 mb-6">
              There are no movies in this category yet.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gold text-black font-semibold rounded-xl hover:bg-gold-light transition-colors"
            >
              Back to Home
            </motion.button>
          </div>
        ) : (
          /* Movies Grid */
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' 
                  : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}
            >
              {movies.map((movie, index) => (
                <motion.div
                  key={`${movie.imdbID}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className={viewMode === 'large' ? 'aspect-[2/3]' : ''}
                >
                  <MovieCard 
                    movie={movie} 
                    onClick={handleMovieClick}
                    size={viewMode === 'large' ? 'large' : 'normal'}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gold/20 to-gold-light/20 hover:from-gold/30 hover:to-gold-light/30 border border-gold/30 rounded-2xl text-gold font-semibold transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      <span>Load More Movies</span>
                    </>
                  )}
                </motion.button>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && movies.length > 0 && (
              <div className="text-center mt-12">
                <p className="text-white/40">
                  You've seen all {totalMovies} movies in this category
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetails 
          imdbId={selectedMovie} 
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
};

export default CategoryMovies;
