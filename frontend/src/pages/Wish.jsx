import { useState } from "react";
import { motion } from "framer-motion";
import TopNavbar from "../components/TopNavbar";

export default function Wish() {

  // which screen is active
  const [mode, setMode] = useState(null);

  // youtube url input
  const [youtubeLink, setYoutubeLink] = useState("");

  // extracted video id
  const [linkVideoId, setLinkVideoId] = useState(null);


  // function to get youtube video id from link
  const getVideoId = (url) => {

    try {

      const parsed = new URL(url);

      // normal youtube link
      // example:
      // https://www.youtube.com/watch?v=VIDEO_ID
      if (parsed.searchParams.get("v")) {

        return parsed.searchParams.get("v");

      }

      // short youtube link
      // example:
      // https://youtu.be/VIDEO_ID
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

      {/* top navbar */}
      <TopNavbar showBackButton={false} />

      <div className="pt-24 px-6">


        {/* ================================
            HOME SCREEN
        ================================= */}

        {!mode && (

          <div className="grid md:grid-cols-2 gap-10 mt-20">

            {/* play by link card */}
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

          </div>

        )}



        {/* ================================
            PLAY BY LINK SCREEN
        ================================= */}

        {mode === "bylink" && (

          <div>

            {/* back button */}
            <button
              onClick={() => setMode(null)}
              className="mb-6 text-yellow-500"
            >
              ← back
            </button>



            {/* input + play button */}
            <div className="flex gap-2 mb-6">

              <input

                value={youtubeLink}

                onChange={(e) =>
                  setYoutubeLink(e.target.value)
                }

                placeholder="paste youtube link"

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

                  const id = getVideoId(youtubeLink);

                  if (id) {

                    setLinkVideoId(id);

                  }

                  else {

                    alert("invalid link");

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



            {/* video player */}
            {linkVideoId && (

              <div
                className="
                  w-full
                  aspect-video
                  lg:h-[75vh]
                  bg-zinc-900
                  rounded-xl
                  overflow-hidden
                "
              >

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