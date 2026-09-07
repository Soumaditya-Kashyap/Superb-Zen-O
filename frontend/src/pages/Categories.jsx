import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Categories = () => {

  const navigate = useNavigate();

  const categories = [
    { id: 1, name: "Action", icon: "AC", color: "#FF4444" },
    { id: 2, name: "Comedy", icon: "CO", color: "#FFD700" },
    { id: 3, name: "Drama", icon: "DR", color: "#9370DB" },
    { id: 4, name: "Horror", icon: "HR", color: "#8B0000" },
    { id: 5, name: "Romance", icon: "RO", color: "#FF69B4" },
    { id: 6, name: "Sci-Fi", icon: "SF", color: "#00CED1" },
    { id: 7, name: "Thriller", icon: "TH", color: "#DC143C" },
    { id: 8, name: "Documentary", icon: "DC", color: "#32CD32" },
  ];

  const handleClick = (category) => {
    navigate(
      `/category/${category.name.toLowerCase()}?title=${category.name}&type=genre`
    );
  };


  return (
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-2">Categories</h1>
        <p className="text-gray-400 text-lg">Browse content by genre</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            whileHover={{ scale: 1.08, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick(category)}
            className="glass-effect-dark rounded-2xl p-8 cursor-pointer flex flex-col items-center justify-center gap-4 border border-white/10 hover:border-white/20 transition-all"
            style={{ boxShadow: `0 0 30px ${category.color}20` }}
          >
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white transition-transform group-hover:scale-110"
              style={{ backgroundColor: category.color }}
            >
              {category.icon}
            </div>

            {/* Name */}
            <h3 className="text-white font-bold text-xl">
              {category.name}
            </h3>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Categories;



