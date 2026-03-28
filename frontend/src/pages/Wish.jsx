import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";

import { Heart, Upload, Youtube } from "lucide-react";
import TopNavbar from "../components/TopNavbar";

const API_KEY = "AIzaSyAKGfMj1tdFUBPLfr3ItCAtJK0YMnCwR4I";

export default function Wish() {


  
  const [mode, setMode] = useState(null);


  // youtube | upload

  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [search, setSearch] = useState("HD Video");

  const [uploadedVideo, setUploadedVideo] = useState(null);

  // fetch youtube videos
  const fetchVideos = async () => {

    const res = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          maxResults: 50,
          q: search,
          key: API_KEY,
          type: "video"
        }
      }
    );

    setVideos(res.data.items);

    if (res.data.items.length > 0) {
      setCurrentVideo(res.data.items[0].id.videoId);
    }
  };

  useEffect(() => {
    if (mode === "youtube") {
      fetchVideos();
    }
  }, [mode]);





  return (

    <div className="min-h-screen bg-black text-white">

      <TopNavbar showBackButton={false} />

      <div className="pt-24 px-6">

        {/* choose section */}
        {!mode && (

          <div className="grid md:grid-cols-2 gap-10 mt-20">

            {/* youtube box */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setMode("youtube")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              <Youtube size={60} className="mx-auto text-red-500 mb-4" />

              <h2 className="text-2xl font-bold">
                YouTube Player
              </h2>

              <p className="text-white/60 mt-2">
                Search and watch YouTube videos
              </p>

            </motion.div>



            {/* upload box */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setMode("upload")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              <Upload size={60} className="mx-auto text-yellow-500 mb-4" />

              <h2 className="text-2xl font-bold">
                Upload Video
              </h2>

              <p className="text-white/60 mt-2">
                Upload and watch your own video
              </p>

            </motion.div>



            {/* Coming Soon */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setMode("Coming Soon")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              <Upload size={60} className="mx-auto text-yellow-500 mb-4" />

              <h2 className="text-2xl font-bold">
                Coming Soon
              </h2>

              <p className="text-white/60 mt-2">
                Coming Soon
              </p>

            </motion.div>

          </div>

        )}



        {/* youtube mode */}
        {mode === "youtube" && (

          <div className="w-full">

            <button
              onClick={() => setMode(null)}
              className="mb-6 text-yellow-500"
            >
              ← back
            </button>



            {/* search */}
            <div className="flex gap-2 mb-6">

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search youtube..."
                className="bg-zinc-900 px-4 py-2 rounded-lg w-full"
              />

              <button
                onClick={fetchVideos}
                className="bg-yellow-500 text-black px-5 rounded-lg"
              >
                Search
              </button>

            </div>



            {/* responsive youtube layout */}
            <div className="
      grid
      grid-cols-1
      lg:grid-cols-3
      gap-6
      min-h-[75vh]
    ">


              {/* PLAYER */}
              <div className="lg:col-span-2">

                <div className="
          w-full
          aspect-video
          lg:h-[75vh]
          bg-zinc-900
          rounded-xl
          overflow-hidden
        ">

                  {currentVideo && (

                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${currentVideo}?autoplay=10`}
                      allow="autoplay"
                      allowFullScreen
                    />

                  )}

                </div>

              </div>



              {/* VIDEO LIST */}
              <div className="
        space-y-4
        overflow-y-auto
        lg:h-[75vh]
        pr-2
      ">

                {videos.map((video) => (

                  <div
                    key={video.id.videoId}
                    onClick={() => setCurrentVideo(video.id.videoId)}
                    className="
              flex
              gap-3
              cursor-pointer
              hover:bg-zinc-900
              p-2
              rounded-lg
              transition
            "
                  >

                    <img
                      src={video.snippet.thumbnails.medium.url}
                      className="
                w-40
                aspect-video
                object-cover
                rounded-lg
              "
                    />

                    <p className="text-sm line-clamp-2">
                      {video.snippet.title}
                    </p>

                  </div>

                ))}

              </div>

            </div>

          </div>

        )}


        {/* upload mode */}
        {mode === "upload" && (

          <div>

            <button
              onClick={() => setMode(null)}
              className="mb-6 text-yellow-500"
            >
              ← back
            </button>


            {/* upload box */}
            <div className="bg-zinc-900 p-10 rounded-xl text-center mb-6">

              <input
                type="file"
                accept="video/*"
                onChange={(e) => {

                  const file = e.target.files[0];

                  if (file) {
                    setUploadedVideo(URL.createObjectURL(file));
                  }

                }}
              />

            </div>


            {/* custom video player */}
            {uploadedVideo && (

              <video
                src={uploadedVideo}
                controls
                className="w-full rounded-xl"
              />

            )}

          </div>

        )}



      </div>


    </div>

  );

}