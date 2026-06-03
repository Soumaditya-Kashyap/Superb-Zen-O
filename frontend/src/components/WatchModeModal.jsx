import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X } from 'lucide-react';

const WatchModeModal = ({ isOpen, onClose, onSelectMode, movieTitle }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl p-8 max-w-md w-full border border-gold/30 shadow-2xl shadow-gold/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center"
            >
              <Users size={32} className="text-black" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Choose Watch Mode</h2>
            <p className="text-white/60 text-sm">How would you like to watch</p>
            <p className="text-gold font-semibold mt-1 truncate">{movieTitle}?</p>
          </div>

          {/* Watch Mode Options */}
          <div className="space-y-4">
            {/* Watch Alone */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode('alone')}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-gold/20 to-gold-light/10 hover:from-gold/30 hover:to-gold-light/20 border border-gold/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User size={24} className="text-black" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-white font-bold text-lg">Watch Alone</h3>
                  <p className="text-white/60 text-sm">Enjoy the movie by yourself</p>
                </div>
              </div>
            </motion.button>

            

            {/* Watch Together */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode('together')}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/10 hover:from-purple-500/30 hover:to-blue-500/20 border border-purple-500/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users size={24} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-white font-bold text-lg">Watch Together</h3>
                  <p className="text-white/60 text-sm">Watch with friends in sync</p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WatchModeModal;
