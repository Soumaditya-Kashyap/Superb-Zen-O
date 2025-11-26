import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, Film, ChevronLeft, X, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MovieService from "../services/movieService";

const TopNavbar = ({ 
  showBackButton = false, 
  onFilterChange, 
  onSearchChange,
  currentFilter = "All Media" 
}) => {
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState(currentFilter);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("User");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const filterOptions = [
    "All Media",
    "Movies",
    "Series",
    "Action",
    "Comedy",
    "Drama",
    "Thriller",
    "Romance",
    "Horror",
    "Sci-Fi"
  ];

  // Fetch Username
  useEffect(() => {
    const fetchUserName = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch("http://localhost:5000/api/movies/personalized", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data?.success && data?.userName) {
          setUserName(data.userName);
        }
      } catch (err) {
        console.log("Failed to fetch username:", err);
      }
    };

    fetchUserName();
  }, []);

  // Search functionality with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await MovieService.searchMovies(searchQuery);
        setSearchResults(results.movies || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterSelect = (filter) => {
    setFilterType(filter);
    setShowFilterDropdown(false);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleMovieClick = (movie) => {
    setShowSearchResults(false);
    setSearchQuery("");
    navigate(`/player/${movie.imdbID}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className="fixed top-0 right-0 left-20 h-20 
      bg-gradient-to-r from-black/60 via-black/50 to-black/60 
      backdrop-blur-2xl border-b border-gold/20 z-40 
      shadow-lg shadow-black/20">

      <div className="h-full px-8 flex items-center justify-between gap-6">

        {/* Back Button */}
        {showBackButton && (
          <motion.button
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-3 bg-black/50 border border-gold/30 rounded-xl 
            hover:bg-black/60 transition-all shadow-gold/20 shadow-lg"
          >
            <ChevronLeft size={26} className="text-gold drop-shadow-md" />
          </motion.button>
        )}

        {/* Filter Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-3 px-5 py-2.5 
              bg-gradient-to-r from-gold/15 to-gold-light/10 
              hover:from-gold/20 hover:to-gold-light/15 
              rounded-xl border border-gold/30 shadow-lg shadow-gold/10 transition-all"
          >
            <Film size={20} className="text-gold" />
            <span className="text-white text-sm font-semibold">{filterType}</span>
            <ChevronDown size={18} className={`text-gold/60 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Filter Dropdown Menu */}
          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 w-48 bg-black/95 backdrop-blur-xl 
                  border border-gold/30 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50"
              >
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleFilterSelect(option)}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-all
                      ${filterType === option 
                        ? 'bg-gold/20 text-gold' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {option}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl relative" ref={searchRef}>
          <div className="relative group">
            <Search
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 
              text-gold/50 group-hover:text-gold transition-colors z-10"
            />

            <input
              type="text"
              placeholder="Search movies, series, shows..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full bg-white/5 border border-gold/20 
              rounded-2xl py-3.5 pl-14 pr-12 text-white placeholder-white/40 
              focus:outline-none focus:border-gold/50 focus:bg-white/10 
              transition-all shadow-inner font-medium"
            />

            {/* Loading/Clear Button */}
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 
                  hover:bg-white/10 rounded-full transition-colors"
              >
                {isSearching ? (
                  <Loader size={18} className="text-gold animate-spin" />
                ) : (
                  <X size={18} className="text-white/50 hover:text-white" />
                )}
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showSearchResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl 
                  border border-gold/30 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 z-50 max-h-[400px] overflow-y-auto"
              >
                <div className="p-2">
                  <p className="px-3 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">
                    {searchResults.length} Results found
                  </p>
                  {searchResults.slice(0, 8).map((movie) => (
                    <motion.button
                      key={movie.imdbID}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                      onClick={() => handleMovieClick(movie)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl transition-all"
                    >
                      {/* Movie Poster */}
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        <img 
                          src={movie.Poster !== 'N/A' ? movie.Poster : '/placeholder-movie.jpg'}
                          alt={movie.Title}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.src = '/placeholder-movie.jpg'}
                        />
                      </div>
                      
                      {/* Movie Info */}
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-semibold text-sm truncate">{movie.Title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/50 text-xs">{movie.Year}</span>
                          {movie.Type && (
                            <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full capitalize">
                              {movie.Type}
                            </span>
                          )}
                          {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                            <span className="text-yellow-400 text-xs">★ {movie.imdbRating}</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* No Results */}
            {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl 
                  border border-gold/30 rounded-2xl p-6 text-center shadow-2xl shadow-black/50 z-50"
              >
                <p className="text-white/60">No movies found for "{searchQuery}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications & Profile */}
        <div className="flex items-center gap-4">

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-3 bg-gradient-to-br from-gold/15 to-gold-light/10 
            hover:from-gold/20 hover:to-gold-light/15 
            rounded-xl border border-gold/30 shadow-lg shadow-gold/10"
          >
            <Bell size={22} className="text-gold" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 
            bg-red-500 rounded-full animate-pulse shadow-red-500/50" />
          </motion.button>

          {/* Profile */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/myspace")}
            className="flex items-center gap-3 px-5 py-2.5 
              bg-gradient-to-r from-gold/15 to-gold-light/10 
              hover:from-gold/20 hover:to-gold-light/15 
              rounded-xl border border-gold/30 shadow-lg shadow-gold/10"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-gold to-gold-light 
            rounded-full flex items-center justify-center shadow-lg shadow-gold/30">
              <span className="text-black font-bold">{userName.charAt(0)}</span>
            </div>

            <div className="text-left">
              <p className="text-white text-sm font-bold">{userName}</p>
              <p className="text-gold text-xs font-semibold">Premium ✦</p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;
