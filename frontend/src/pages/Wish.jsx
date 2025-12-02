import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Star } from 'lucide-react';
import TopNavbar from '../components/TopNavbar';

const Wish = () => {
  return (
    <div className="min-h-screen bg-black">
      <TopNavbar showBackButton={false} />
      
      <div className="pt-28 px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
            className="mb-8"
          >
            <Heart size={80} className="text-gold fill-gold/30" />
          </motion.div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Wishlist
          </h1>
          
          <p className="text-white/60 text-lg max-w-md mb-8">
            Save your favorite movies and shows to watch later. 
            This feature is coming soon!
          </p>
          
          <div className="flex items-center gap-2 text-gold/80 bg-gold/10 px-6 py-3 rounded-full">
            <Sparkles size={20} />
            <span className="font-medium">Coming Soon</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Wish;
