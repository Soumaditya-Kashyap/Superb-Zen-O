/*
====================================================
WISH PAGE
Media Hub
====================================================

Features:
1. YouTube search videos
2. Custom YouTube player
3. Upload local video
4. Play video from YouTube link
5. Responsive layout
6. Clean developer comments

====================================================
*/

import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Upload, Youtube } from "lucide-react";
import TopNavbar from "../components/TopNavbar";



// your youtube api key
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export default function Wish() {


  /*
  ===============================
  PAGE MODE
  ===============================
  null      -> show options
  youtube   -> youtube search player
  upload    -> upload local video
  bylink    -> play youtube link
  ===============================
  */
  const [mode, setMode] = useState(null);



  /*
  ===============================
  YOUTUBE SEARCH STATES
  ===============================
  */
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [search, setSearch] = useState("hd video");



  /*
  ===============================
  UPLOAD VIDEO STATE
  ===============================
  */
  const [uploadedVideo, setUploadedVideo] = useState(null);



  /*
  ===============================
  PLAY BY LINK STATE
  ===============================
  */
  const [youtubeLink, setYoutubeLink] = useState("");
  const [linkVideoId, setLinkVideoId] = useState(null);



  /*
  ===============================
  FETCH YOUTUBE VIDEOS
  ===============================
  */
 const fetchVideos = async () => {
  console.log("API KEY =", API_KEY);

  if (!search) return;

  const res = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        part: "snippet",
        maxResults: 12,
        q: search,
        type: "video",
        key: API_KEY
      }
    }
  );

  setVideos(res.data.items);

  if (res.data.items.length > 0) {
    setCurrentVideo(res.data.items[0].id.videoId);
  }
};


  /*
  ===============================
  LOAD VIDEOS WHEN PAGE OPENS
  ===============================
  */
  useEffect(() => {

    if (mode === "youtube") {

      fetchVideos();

    }

  }, [mode]);



  /*
  ===============================
  EXTRACT VIDEO ID FROM LINK
  ===============================
  supports:

  youtube.com/watch?v=
  youtu.be/
  ===============================
  */
  const getVideoId = (url) => {

    try {

      const parsed = new URL(url);


      // normal youtube link
      if (parsed.searchParams.get("v")) {

        return parsed.searchParams.get("v");

      }


      // short youtube link
      if (parsed.hostname.includes("youtu.be")) {

        return parsed.pathname.slice(1);

      }

      return null;

    }

    catch {

      return null;

    }

  };



  return (

    <div className="min-h-screen bg-black text-white">

      {/* navbar */}
      <TopNavbar showBackButton={false} />


      <div className="pt-24 px-6">


        {/* =====================================================
           HOME OPTIONS
        ===================================================== */}

        {!mode && (

          <div className="grid md:grid-cols-2 gap-10 mt-20">


            {/* youtube */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setMode("youtube")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              <Youtube
                size={60}
                className="mx-auto text-red-500 mb-4"
              />

              <h2 className="text-2xl font-bold">

                YouTube Player

              </h2>

              <p className="text-white/60 mt-2">

                Search videos

              </p>

            </motion.div>



            {/* upload */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setMode("upload")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              <Upload
                size={60}
                className="mx-auto text-yellow-500 mb-4"
              />

              <h2 className="text-2xl font-bold">

                Upload Video

              </h2>

              <p className="text-white/60 mt-2">

                Play local video

              </p>

            </motion.div>



            {/* by link */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setMode("bylink")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              🔗

              <h2 className="text-2xl font-bold">

                Play by Link

              </h2>

              <p className="text-white/60 mt-2">

                Paste YouTube URL

              </p>

            </motion.div>



            {/* coming soon */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => alert("coming soon")}
              className="bg-zinc-900 p-10 rounded-xl cursor-pointer text-center"
            >

              ⭐

              <h2 className="text-2xl font-bold">

                Coming Soon

              </h2>

              <p className="text-white/60 mt-2">

                future features

              </p>

            </motion.div>

          </div>

        )}



        {/* =====================================================
           YOUTUBE SEARCH MODE
        ===================================================== */}

        {mode === "youtube" && (

          <div>

            {/* back */}
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
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="search youtube..."
                className="
                  bg-zinc-900
                  px-4
                  py-2
                  rounded-lg
                  w-full
                "
              />


              <button
                onClick={fetchVideos}
                className="
                  bg-yellow-500
                  text-black
                  px-5
                  rounded-lg
                "
              >

                Search

              </button>

            </div>



            {/* layout */}
            <div className="
              grid
              grid-cols-1
              lg:grid-cols-3
              gap-6
              min-h-[75vh]
            ">


              {/* player */}
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

                      src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`}

                      allow="autoplay"

                      allowFullScreen
                    />

                  )}

                </div>

              </div>



              {/* video list */}
              <div className="
                space-y-4
                overflow-y-auto
                lg:h-[75vh]
              ">

                {videos.map((video) => (

                  <div
                    key={video.id.videoId}

                    onClick={() =>
                      setCurrentVideo(
                        video.id.videoId
                      )
                    }

                    className="
                      flex
                      gap-3
                      cursor-pointer
                      hover:bg-zinc-900
                      p-2
                      rounded-lg
                    "
                  >

                    <img
                      src={
                        video.snippet
                        .thumbnails.medium.url
                      }
                      className="
                        w-40
                        aspect-video
                        rounded-lg
                      "
                    />


                    <p className="
                      text-sm
                      line-clamp-2
                    ">

                      {video.snippet.title}

                    </p>

                  </div>

                ))}

              </div>

            </div>

          </div>

        )}



        {/* =====================================================
           UPLOAD VIDEO MODE
        ===================================================== */}

        {mode === "upload" && (

          <div>

            <button
              onClick={() => setMode(null)}
              className="mb-6 text-yellow-500"
            >
              ← back
            </button>



            <div className="
              bg-zinc-900
              p-10
              rounded-xl
              text-center
              mb-6
            ">

              <input
                type="file"

                accept="video/*"

                onChange={(e) => {

                  const file =
                    e.target.files[0];

                  if (file) {

                    setUploadedVideo(

                      URL.createObjectURL(file)

                    );

                  }

                }}
              />

            </div>



            {uploadedVideo && (

              <video
                src={uploadedVideo}
                controls
                className="w-full rounded-xl"
              />

            )}

          </div>

        )}



        {/* =====================================================
           PLAY BY LINK MODE
        ===================================================== */}

        {mode === "bylink" && (

          <div>

            <button
              onClick={() => setMode(null)}
              className="mb-6 text-yellow-500"
            >
              ← back
            </button>



            <div className="flex gap-2 mb-6">

              <input

                value={youtubeLink}

                onChange={(e) =>
                  setYoutubeLink(
                    e.target.value
                  )
                }

                placeholder="
                  paste youtube link
                "

                className="
                  bg-zinc-900
                  px-4
                  py-2
                  rounded-lg
                  w-full
                "
              />


              <button

                onClick={() => {

                  const id =
                    getVideoId(
                      youtubeLink
                    );

                  if (id) {

                    setLinkVideoId(id);

                  }

                  else {

                    alert(
                      "invalid link"
                    );

                  }

                }}

                className="
                  bg-yellow-500
                  text-black
                  px-5
                  rounded-lg
                "
              >

                Play

              </button>

            </div>



            {linkVideoId && (

              <div className="
                w-full
                aspect-video
                lg:h-[75vh]
                bg-zinc-900
                rounded-xl
                overflow-hidden
              ">

                <iframe
                  className="w-full h-full"

                  src={`https://www.youtube.com/embed/${linkVideoId}?autoplay=1`}

                  allow="autoplay"

                  allowFullScreen
                />

              </div>

            )}

          </div>

        )}



      </div>

    </div>

  );

}