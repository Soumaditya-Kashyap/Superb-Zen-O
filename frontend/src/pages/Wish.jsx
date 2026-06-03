import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  FiLink, FiArrowLeft, FiPlay, FiPause, FiVolume2, FiVolumeX, 
  FiMaximize, FiFastForward, FiRewind 
} from "react-icons/fi"; 

import TopNavbar from "../components/TopNavbar";
import WatchModeModal from "../components/WatchModeModal";

export default function Wish() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  // =========================================
  // STATES
  // =========================================
  const [mode, setMode] = useState(null); // 'bylink' or null
  const [youtubeLink, setYoutubeLink] = useState("");
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState(null);
  const [movieTitle, setMovieTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // Player UI States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [speed, setSpeed] = useState(1);
  
  // Modal & Transition States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempVideoData, setTempVideoData] = useState(null);

  // =========================================
  // YOUTUBE API COMMANDS
  // =========================================
  const sendCommand = (func, args = []) => {
    if (!iframeRef.current) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      sendCommand("pauseVideo");
    } else {
      sendCommand("playVideo");
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value) => {
    const vol = Number(value);
    setVolume(vol);
    sendCommand("setVolume", [vol]);
    if (vol > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      sendCommand("unMute");
      setIsMuted(false);
    } else {
      sendCommand("mute");
      setIsMuted(true);
    }
  };

  const changePlaybackSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(nextSpeed);
    sendCommand("setPlaybackRate", [nextSpeed]);
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("player-container");
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error("Fullscreen error", err));
    } else {
      document.exitFullscreen();
    }
  };

  // =========================================
  // URL PARSING & FETCHING
  // =========================================
  const getVideoId = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
      if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
      return null;
    } catch { return null; }
  };

  const handlePlayVideo = async () => {
    const id = getVideoId(youtubeLink);
    if (!id) return alert("Invalid YouTube URL");

    try {
      setLoading(true);
      // Fetch metadata from backend
      const response = await axios.get(`window.API_BASE_URL/youtube/video/${id}`);
      
      const videoData = { 
        id, 
        title: response.data.title, 
        url: response.data.embedUrl 
      };

      navigate("/watch-together", {
        state: {
          youtubeMovie: {
            _id: `yt_${videoData.id}`,
            Title: videoData.title,
            Poster: `https://i.ytimg.com/vi/${videoData.id}/hqdefault.jpg`,
            youtubeId: videoData.id,
            isYoutube: true,
            embedUrl: videoData.url,
            Runtime: "Live Stream",
            Genre: "YouTube Video",
            Year: new Date().getFullYear().toString()
          }
        }
      });
    } catch (err) {
      console.error(err);
      alert("Failed to load video info.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // RENDER
  // =========================================
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500/30">
      <TopNavbar showBackButton={false} />

      <main className="pt-32 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!mode ? (
            /* Home Screen Selection */
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex justify-center mt-20"
            >
              <div 
                onClick={() => setMode("bylink")}
                className="group w-full max-w-md bg-zinc-900 border border-zinc-800 p-12 rounded-[2.5rem] cursor-pointer hover:border-yellow-500/50 transition-all text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-yellow-500 group-hover:scale-110 transition-transform">
                  <FiLink size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-2">Play by Link</h2>
                <p className="text-zinc-500">Paste any YouTube URL to launch our custom OTT player.</p>
              </div>
            </motion.div>
          ) : (
            /* Player View */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Reset Mode */}
              <button 
                onClick={() => { setMode(null); setYoutubeEmbedUrl(null); setYoutubeLink(""); }} 
                className="flex items-center gap-2 text-zinc-400 hover:text-yellow-500 transition-colors"
              >
                <FiArrowLeft /> Back to Selection
              </button>

              {/* URL Input Bar */}
              <div className="flex gap-3 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 focus-within:border-yellow-500/50 transition-all">
                <input
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="Paste YouTube Link here..."
                  className="bg-transparent px-4 py-2 w-full outline-none text-lg"
                />
                <button
                  onClick={handlePlayVideo}
                  disabled={loading}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
                >
                  {loading ? "Loading..." : "Play"}
                </button>
              </div>

              {/* Video Player Display */}
              {youtubeEmbedUrl && (
                <div id="player-container" className="relative w-full aspect-video rounded-3xl overflow-hidden border border-zinc-800 bg-black group shadow-2xl">
                  {/* YouTube Iframe (Background) */}
                  <iframe
                    ref={iframeRef}
                    src={`${youtubeEmbedUrl}&enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    allow="autoplay"
                  />

                  {/* UI OVERLAY (Visible on hover) */}
                  <div className="absolute inset-0 z-20 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-transparent to-black/40 p-8">
                    
                    {/* Top Info Bar */}
                    <div className="absolute top-8 left-8 flex items-center gap-4">
                        <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg max-w-xl truncate">{movieTitle}</h3>
                        <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-black">HD</span>
                    </div>

                    {/* Bottom Controls Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {/* Play/Pause */}
                        <button onClick={handlePlayPause} className="text-white hover:text-yellow-500 transition-colors">
                          {isPlaying ? <FiPause size={32} /> : <FiPlay size={32} fill="currentColor" />}
                        </button>
                        
                        {/* 10s Seek Controls */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => sendCommand("seekTo", [-10, true])} className="text-white/70 hover:text-white transition-colors">
                                <FiRewind size={24} />
                            </button>
                            <button onClick={() => sendCommand("seekTo", [10, true])} className="text-white/70 hover:text-white transition-colors">
                                <FiFastForward size={24} />
                            </button>
                        </div>

                        {/* Volume Control */}
                        <div className="flex items-center gap-3 ml-4">
                          <button onClick={toggleMute} className="text-white transition-colors hover:text-yellow-500">
                            {isMuted || volume === 0 ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
                          </button>
                          <input 
                            type="range" min="0" max="100" value={volume} 
                            onChange={(e) => handleVolumeChange(e.target.value)}
                            className="w-24 accent-yellow-500 h-1 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Right Side Controls */}
                      <div className="flex items-center gap-6">
                        <button onClick={changePlaybackSpeed} className="font-bold text-sm bg-white/10 px-4 py-1.5 rounded-lg hover:bg-white/20 transition-all border border-white/10">
                          {speed}x
                        </button>
                        
                        <button onClick={toggleFullscreen} className="text-white hover:text-yellow-500 transition-colors">
                          <FiMaximize size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}