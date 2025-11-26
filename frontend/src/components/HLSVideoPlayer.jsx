import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Loader
} from 'lucide-react';

const HLSVideoPlayer = ({ movieId, movieTitle, posterUrl }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const controlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const bandwidthMonitorRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [availableQualities, setAvailableQualities] = useState([]);
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [currentBandwidth, setCurrentBandwidth] = useState(0);

  // HLS video URL - pointing to master playlist
  const videoUrl = `http://localhost:5000/api/video/stream/${movieId}/master.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        // Progressive loading - load segments one by one
        maxBufferLength: 10,        // Only buffer 10 seconds ahead
        maxMaxBufferLength: 20,     // Maximum 20 seconds buffer
        maxBufferSize: 10 * 1000 * 1000,  // 10MB max buffer
        maxBufferHole: 0.5,
        backBufferLength: 10,       // Keep only 10 seconds behind
        // Adaptive bitrate settings - continuous monitoring
        abrEwmaDefaultEstimate: 500000,    // Start conservative (500 Kbps)
        abrBandWidthFactor: 0.95,          // Use 95% of measured bandwidth
        abrBandWidthUpFactor: 0.7,         // Be conservative going up
        abrMaxWithRealBitrate: true,       // Don't exceed measured bandwidth
        abrEwmaSlowVoD: 3,                 // Slower EWMA for VOD (more reactive)
        abrEwmaFastVoD: 3,                 // Fast EWMA for quick adaptation
        // Fragment loading strategy
        startLevel: -1,                    // Start with auto quality
        autoStartLoad: true,
      });

      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      // HLS Events
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Extract quality levels
        const qualities = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          label: `${level.height}p`
        }));

        setAvailableQualities(qualities);
        setIsLoading(false);
        
        // Auto-play
        video.play().catch(err => {
          console.log('⚠️  Autoplay prevented:', err);
          setIsLoading(false);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const quality = hls.levels[data.level];
        if (hls.autoLevelEnabled) {
          setCurrentQuality(`Auto (${quality.height}p)`);
          console.log(`[AUTO] Switched to ${quality.height}p`);
        } else {
          setCurrentQuality(`${quality.height}p`);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, retrying...');
              setError('Network error occurred. Retrying...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, recovering...');
              setError('Media error occurred. Recovering...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error');
              setError('Failed to load video. Please refresh.');
              hls.destroy();
              break;
          }
        }
      });

      // Bandwidth monitoring for adaptive quality
      hls.on(Hls.Events.FRAG_LOAD_PROGRESS, (event, data) => {
        // Monitor download speed during fragment loading
        const stats = data.stats;
        if (stats && stats.loaded && stats.total) {
          const progress = ((stats.loaded / stats.total) * 100).toFixed(1);
          
          // Calculate instantaneous download speed
          if (stats.bwEstimate) {
            const speed = (stats.bwEstimate / 1000000).toFixed(2);
            
            // If in auto mode and speed drops significantly, HLS will auto-adjust
            if (hls.autoLevelEnabled && speed < 1) {
              console.log(`[BANDWIDTH] Low speed detected: ${speed}Mbps - Auto adjusting...`);
            }
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
        // Only show buffering if video is actually waiting
        if (video.readyState < 3) {
          setBuffering(true);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        setBuffering(false);
        
        // Update bandwidth continuously
        if (hls.bandwidthEstimate) {
          const bandwidth = (hls.bandwidthEstimate / 1000000).toFixed(2);
          setCurrentBandwidth(parseFloat(bandwidth));
          
          // Log bandwidth info for debugging
          const stats = data.stats;
          if (stats) {
            const size = (stats.total / 1024).toFixed(0);
            const duration = ((stats.loading.end - stats.loading.start) / 1000).toFixed(2);
            console.log(`[SEGMENT] Loaded ${size}KB in ${duration}s | Est. bandwidth: ${bandwidth}Mbps`);
          }
        }
      });
      
      // Continuous bandwidth monitoring every 10 seconds
      const startBandwidthMonitor = () => {
        bandwidthMonitorRef.current = setInterval(() => {
          if (hls && hls.autoLevelEnabled && hls.bandwidthEstimate) {
            const currentLevel = hls.levels[hls.currentLevel];
            
            setCurrentQuality(`Auto (${currentLevel.height}p)`);
            
            // Force quality re-evaluation based on current bandwidth
            if (hls.autoLevelEnabled) {
              const currentLevelBitrate = currentLevel.bitrate / 1000000;
              const availableBw = hls.bandwidthEstimate / 1000000;
              
              // If bandwidth is insufficient for current quality, force adjustment
              if (availableBw < currentLevelBitrate * 1.1) {
                hls.nextLevel = -1; // Trigger ABR re-evaluation
              }
            }
          }
        }, 10000); // Check every 10 seconds
      };
      
      // Start monitoring after manifest is loaded
      if (hls.autoLevelEnabled) {
        startBandwidthMonitor();
      }

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
      setIsLoading(false);
    } else {
      setError('Your browser does not support HLS video playback');
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (bandwidthMonitorRef.current) {
        clearInterval(bandwidthMonitorRef.current);
      }
    };
  }, [videoUrl, movieId]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Controls visibility - keep visible when hovering
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Only start hide timer if not hovering controls and video is playing
    if (!isHoveringControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isHoveringControls) {
          setShowControls(false);
        }
      }, 3000);
    }
  };
  
  const handleMouseEnter = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };
  
  const handleControlsMouseEnter = () => {
    setIsHoveringControls(true);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };
  
  const handleControlsMouseLeave = () => {
    setIsHoveringControls(false);
    
    // Start hide timer when leaving controls
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressClick = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    // When seeking, show buffering immediately
    setBuffering(true);
    videoRef.current.currentTime = newTime;
    
    // HLS will now load only the necessary segments for the new position
    if (hlsRef.current) {
      console.log(`[SEEK] Jumped to ${newTime.toFixed(2)}s - Loading required segments only`);
    }
  };

  const skip = (seconds) => {
    setBuffering(true);
    videoRef.current.currentTime += seconds;
    console.log(`[SKIP] ${seconds > 0 ? '+' : ''}${seconds}s to ${videoRef.current.currentTime.toFixed(2)}s`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeQuality = (qualityIndex) => {
    if (hlsRef.current && videoRef.current) {
      const wasPlaying = !videoRef.current.paused;
      const currentTimeBeforeSwitch = videoRef.current.currentTime;
      
      // Stop bandwidth monitor if running
      if (bandwidthMonitorRef.current) {
        clearInterval(bandwidthMonitorRef.current);
      }
      
      if (qualityIndex === -1) {
        // Enable adaptive bitrate
        hlsRef.current.currentLevel = -1;
        setCurrentQuality('Auto');
        console.log('[QUALITY] Auto mode enabled - Will adapt based on bandwidth');
        
        // Restart bandwidth monitoring for auto mode
        bandwidthMonitorRef.current = setInterval(() => {
          if (hlsRef.current && hlsRef.current.autoLevelEnabled && hlsRef.current.bandwidthEstimate) {
            const currentLevel = hlsRef.current.levels[hlsRef.current.currentLevel];
            
            setCurrentQuality(`Auto (${currentLevel.height}p)`);
            
            // Force quality re-evaluation if bandwidth is insufficient
            const currentLevelBitrate = currentLevel.bitrate / 1000000;
            const availableBw = hlsRef.current.bandwidthEstimate / 1000000;
            
            if (availableBw < currentLevelBitrate * 1.1) {
              hlsRef.current.nextLevel = -1;
            }
          }
        }, 10000);
      } else {
        // Manual quality selection - stop monitoring
        hlsRef.current.currentLevel = qualityIndex;
        const quality = hlsRef.current.levels[qualityIndex];
        setCurrentQuality(`${quality.height}p`);
        const bitrate = (quality.bitrate / 1000000).toFixed(2);
        console.log(`[QUALITY] Manual: ${quality.height}p (${bitrate}Mbps) - Monitoring stopped`);
      }
      
      // Show buffering during quality switch
      setBuffering(true);
      
      // Resume playback after quality switch
      videoRef.current.currentTime = currentTimeBeforeSwitch;
      if (wasPlaying) {
        setTimeout(() => {
          videoRef.current.play().catch(err => console.log('Resume error:', err));
          setBuffering(false);
        }, 100);
      } else {
        setBuffering(false);
      }
    }
    setShowQualityMenu(false);
  };

  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        setIsHoveringControls(false);
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 500);
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={posterUrl}
        onClick={togglePlay}
        playsInline
      />

      {/* Loading Overlay */}
      {(isLoading || buffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader size={48} className="text-gold" />
          </motion.div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-6">
            <p className="text-red-400 text-lg mb-2">⚠️ {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gold text-black rounded-lg font-semibold hover:bg-gold-light transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-gold/90 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-gold/50 hover:bg-gold transition-all"
          >
            <Play size={36} className="text-black ml-1" fill="currentColor" />
          </motion.button>
        </motion.div>
      )}

      {/* Controls */}
      <AnimatePresence>
        {showControls && !isLoading && (
          <motion.div
            ref={controlsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onMouseEnter={handleControlsMouseEnter}
            onMouseLeave={handleControlsMouseLeave}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-6 py-4 pt-12"
          >
            {/* Progress Bar */}
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-4 hover:h-2.5 transition-all group/progress relative"
            >
              {/* Progress Fill */}
              <div
                className="h-full bg-gold rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Rounded Head/Thumb */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gold rounded-full shadow-lg shadow-gold/50 border-2 border-white transition-transform hover:scale-125"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={24} className="text-white" fill="white" />
                  ) : (
                    <Play size={24} className="text-white" fill="white" />
                  )}
                </button>

                {/* Skip Back */}
                <button
                  onClick={() => skip(-10)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <SkipBack size={20} className="text-white" />
                </button>

                {/* Skip Forward */}
                <button
                  onClick={() => skip(10)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <SkipForward size={20} className="text-white" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/volume">
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={24} className="text-white" />
                    ) : (
                      <Volume2 size={24} className="text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/volume:w-20 transition-all accent-gold"
                  />
                </div>

                {/* Time */}
                <span className="text-white text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Quality Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Settings size={20} className="text-white" />
                    <span className="text-white text-sm font-semibold">{currentQuality}</span>
                  </button>

                  {showQualityMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden min-w-[120px]"
                    >
                      <button
                        onClick={() => changeQuality(-1)}
                        className={`w-full px-4 py-2 text-left hover:bg-gold/20 transition-colors ${
                          currentQuality === 'Auto' ? 'bg-gold/30 text-gold' : 'text-white'
                        }`}
                      >
                        Auto
                      </button>
                      {availableQualities.map((quality) => (
                        <button
                          key={quality.index}
                          onClick={() => changeQuality(quality.index)}
                          className={`w-full px-4 py-2 text-left hover:bg-gold/20 transition-colors ${
                            currentQuality === quality.label ? 'bg-gold/30 text-gold' : 'text-white'
                          }`}
                        >
                          {quality.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize size={24} className="text-white" />
                  ) : (
                    <Maximize size={24} className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

HLSVideoPlayer.propTypes = {
  movieId: PropTypes.string.isRequired,
  movieTitle: PropTypes.string.isRequired,
  posterUrl: PropTypes.string
};

export default HLSVideoPlayer;
