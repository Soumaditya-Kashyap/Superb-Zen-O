import React from "react";
import { motion } from "framer-motion";
import Footer from "./Footer";

const About = () => {

  const cardClass =
    "bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-lg";

  const hoverEffect = {
    whileHover: {
      scale: 1.05,
      y: -6,
      boxShadow: "0px 20px 40px rgba(0,0,0,0.6)"
    },
    transition: { type: "spring", stiffness: 200 }
  };

  return (
    <div className="min-h-screen p-10 text-white">

      <div className="max-w-6xl mx-auto">

        {/* title */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h1
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-6xl font-bold mb-4"
          >
            🎬 Superb 
          </motion.h1>

          <p className="text-gray-400 text-lg">
            Watch Together. Feel Together. Enjoy Together.
          </p>
        </motion.div>



        {/* overview */}
        <motion.div
          {...hoverEffect}
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`${cardClass} mb-8`}
        >
          <h2 className="text-2xl text-yellow-400 mb-3">
            🌍 Overview
          </h2>

          <p className="text-gray-300 leading-relaxed">
            Superb Song is a collaborative OTT streaming platform where users can watch videos together 
            using synchronized playback. It creates a virtual cinema environment where friends can enjoy 
            content together even when they are in different locations.
          </p>
        </motion.div>



        {/* feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">

          <motion.div
            {...hoverEffect}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cardClass}
          >
            <h3 className="text-xl mb-2 text-yellow-400">
              🎥 Sync Player
            </h3>

            <p className="text-gray-400">
              Watch video in real-time sync. Play, pause and seek together with friends.
            </p>
          </motion.div>



          <motion.div
            {...hoverEffect}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cardClass}
          >
            <h3 className="text-xl mb-2 text-yellow-400">
              👥 Watch Together
            </h3>

            <p className="text-gray-400">
              Create room and invite friends using link for shared viewing experience.
            </p>
          </motion.div>



          <motion.div
            {...hoverEffect}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cardClass}
          >
            <h3 className="text-xl mb-2 text-yellow-400">
              🚀 Modern UI
            </h3>

            <p className="text-gray-400">
              Clean interface built with Tailwind CSS for fast and smooth user experience.
            </p>
          </motion.div>

        </div>



        {/* advanced features */}
        <motion.div
          {...hoverEffect}
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className={`${cardClass} mb-8`}
        >
          <h2 className="text-2xl text-yellow-400 mb-3">
            🤖 Future Features
          </h2>

          <div className="grid md:grid-cols-2 gap-4 text-gray-300">

            <div>📞 voice & video call integration</div>
            <div>📺 live streaming support</div>
            <div>😊 emoji reactions</div>
            <div>🌐 adaptive video quality</div>
            <div>🎯 group recommendations</div>
            <div>⚡ high performance player</div>

          </div>

        </motion.div>



        {/* tech stack */}
        <motion.div
          {...hoverEffect}
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={cardClass}
        >
          <h2 className="text-2xl text-yellow-400 mb-4">
            🛠 Tech Stack
          </h2>

          <div className="flex flex-wrap gap-3">

            {[
              "React",
              "Node.js",
              "Express",
              "Socket.io",
              "Tailwind",
            ].map((tech, i) => (

              <motion.span
                key={i}
                whileHover={{ scale: 1.15 }}
                className="px-3 py-1 bg-black border border-zinc-700 rounded-lg cursor-default"
              >
                {tech}
              </motion.span>

            ))}

          </div>

        </motion.div>



      

      </div>
      <Footer />

    </div>
  );
};

export default About;