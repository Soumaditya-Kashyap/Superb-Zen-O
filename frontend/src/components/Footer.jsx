import React from "react";
import { motion } from "framer-motion";

const Footer = () => {

  const hover = {
    whileHover: { scale: 1.1, y: -2 },
    transition: { type: "spring", stiffness: 300 }
  };

  return (
    <footer className="mt-20 border-t border-zinc-800 bg-black/40 backdrop-blur-md">

      {/* top gradient line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-40" />

      <div className="max-w-6xl mx-auto px-6 py-12">

        <div className="grid md:grid-cols-4 gap-10">

          {/* project info */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold text-yellow-400">
              🎬 Superb Song
            </h2>

            <p className="text-gray-400 text-sm mt-3">
              Watch videos together with synchronized playback and modern UI.
            </p>
          </motion.div>



          {/* quick links */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg text-yellow-400 mb-3">
              🔗 Links
            </h3>

            <div className="flex flex-col gap-2 text-gray-400">

              <motion.a {...hover} href="/">Home</motion.a>
              <motion.a {...hover} href="/about">About</motion.a>
              <motion.a {...hover} href="/settings">Settings</motion.a>

            </div>
          </motion.div>



          {/* tech */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg text-yellow-400 mb-3">
              🛠 Tech
            </h3>

            <div className="flex flex-wrap gap-2 text-sm">

              {["React", "Node", "Express", "Socket.io"].map((t,i)=>(

                <motion.span
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-gray-300"
                >
                  {t}
                </motion.span>

              ))}

            </div>

          </motion.div>



          {/* developer touch */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg text-yellow-400 mb-3">
              👨‍💻 Developer Touch
            </h3>

            <p className="text-gray-400 text-sm mb-3">
              Designed & Developed by
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
            >
                <p className="text-white font-medium">
                Soumaditya Kashyap
              </p>
              <p className="text-white font-medium">
                Rakibul Hussain
              </p>
              <p className="text-white font-medium">
                Sekander Ali
              </p>

              <p className="text-gray-500 text-xs">
                Full Stack Developer
              </p>
            </motion.div>

          </motion.div>

        </div>



        {/* bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-500 text-sm mt-12"
        >
          © {new Date().getFullYear()} Superb Song • Built with ❤️ using modern web technologies
        </motion.div>

      </div>

    </footer>
  );
};

export default Footer;