import { useState, useEffect } from "react";
import { Search, Bell, ChevronDown, Film, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const TopNavbar = ({ showBackButton = false }) => {
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState("All Media");
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("User");

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
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-3 px-5 py-2.5 
            bg-gradient-to-r from-gold/15 to-gold-light/10 
            hover:from-gold/20 hover:to-gold-light/15 
            rounded-xl border border-gold/30 shadow-lg shadow-gold/10 transition-all">

            <Film size={20} className="text-gold" />
            <span className="text-white text-sm font-semibold">{filterType}</span>
            <ChevronDown size={18} className="text-gold/60" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative group">
            <Search
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 
              text-gold/50 group-hover:text-gold transition-colors"
            />

            <input
              type="text"
              placeholder="Search movies, series, shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/20 
              rounded-2xl py-3.5 pl-14 pr-6 text-white placeholder-white/40 
              focus:outline-none focus:border-gold/50 focus:bg-white/10 
              transition-all shadow-inner font-medium"
            />
          </div>
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
