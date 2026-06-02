import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
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
  Loader,
  AlertCircle
} from 'lucide-react';

// Constants
const CONTROLS_HIDE_DELAY = 3000;
const CONTROLS_QUICK_HIDE_DELAY = 500;
const QUALITY_SWITCH_DELAY = 100;
const STREAM_SOURCE = 'CloudFront';

const HLSVideoPlayer = forwardRef(({ streamUrl, posterUrl, onPlay, onPause, onSeeked, controlsDisabled = false, autoPlay = false }, ref) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const controlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const [showNoAccessToast, setShowNoAccessToast] = useState(false);
  const toastTimeoutRef = useRef(null);
  const bufferTimeoutRef = useRef(null);
  const recoveryTimeoutRef = useRef(null);
  const isForcedLowQualityRef = useRef(false);

  const triggerNoAccessToast = useCallback(() => {
    setShowNoAccessToast(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowNoAccessToast(false);
    }, 2000);
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);
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

  // Expose video ref to parent component
  useImperativeHandle(ref, () => ({
    get video() {
      return videoRef.current;
    },
    get hls() {
      return hlsRef.current;
    }
  }), []); // Empty deps - refs are stable

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    console.log(`🎬 Loading video from CloudFront: ${streamUrl}`);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1,  // Auto quality - HLS.js handles ABR automatically
        autoStartLoad: true,
        // CloudFront optimized settings
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        // ABR settings for smooth quality switching
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      // HLS Events
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
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
        if (autoPlay) {
          video.play().catch((err) => {
            console.warn('Autoplay prevented:', err.message);
            setIsLoading(false);
          });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const quality = hls.levels[data.level];
        if (hls.autoLevelEnabled) {
          setCurrentQuality(`Auto (${quality.height}p)`);
        } else {
          setCurrentQuality(`${quality.height}p`);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
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

      hls.on(Hls.Events.FRAG_LOADING, () => {
        if (video.readyState < 3) {
          setBuffering(true);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setBuffering(false);
      });
      
      // HLS.js handles ABR automatically - no need for manual bandwidth monitoring

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch((err) => console.warn('Native autoplay prevented:', err.message));
      }
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
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, [streamUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay && !controlsDisabled) onPlay();
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (onPause && !controlsDisabled) onPause();
    };
    const handleWaiting = () => {
      setBuffering(true);
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
      if (bufferTimeoutRef.current) return;
      bufferTimeoutRef.current = setTimeout(() => {
        if (hlsRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
          console.log('[ABR] Slow connection detected: downshifting quality to lowest.');
          hlsRef.current.currentLevel = 0;
          isForcedLowQualityRef.current = true;
          setCurrentQuality(`Auto (Optimizing...)`);
        }
      }, 1500);
    };
    const handleCanPlay = () => {
      setBuffering(false);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
        bufferTimeoutRef.current = null;
      }
      if (isForcedLowQualityRef.current && !recoveryTimeoutRef.current) {
        recoveryTimeoutRef.current = setTimeout(() => {
          if (hlsRef.current) {
            console.log('[ABR] Stabilized: restoring Auto quality.');
            hlsRef.current.currentLevel = -1;
            isForcedLowQualityRef.current = false;
          }
          recoveryTimeoutRef.current = null;
        }, 10000);
      }
    };
    const handleSeeked = () => {
      if (onSeeked && !controlsDisabled) onSeeked();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [onPlay, onPause, onSeeked, controlsDisabled]);
  // Sync video element volume with state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Controls visibility - keep visible when hovering
  const handleMouseMove = useCallback(() => {
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
      }, CONTROLS_HIDE_DELAY);
    }
  }, [isHoveringControls, isPlaying]);
  
  const handleMouseEnter = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);
  
  const handleControlsMouseEnter = useCallback(() => {
    setIsHoveringControls(true);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);
  
  const handleControlsMouseLeave = useCallback(() => {
    setIsHoveringControls(false);
    
    // Start hide timer when leaving controls
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, CONTROLS_HIDE_DELAY);
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (controlsDisabled) {
      triggerNoAccessToast();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play().catch((err) => console.warn('Play prevented:', err.message));
    } else {
      video.pause();
    }
  }, [controlsDisabled, triggerNoAccessToast]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const handleProgressClick = useCallback((e) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    const video = videoRef.current;
    if (!video) return;
    
    setBuffering(true);
    video.currentTime = newTime;
  }, [duration]);

  const skip = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    
    setBuffering(true);
    video.currentTime += seconds;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const changeQuality = useCallback((qualityIndex) => {
    if (!hlsRef.current || !videoRef.current) return;
    
    const hls = hlsRef.current;
    const video = videoRef.current;
    const wasPlaying = !video.paused;
    const currentTimeBeforeSwitch = video.currentTime;
    
    if (qualityIndex === -1) {
      // Enable adaptive bitrate - HLS.js handles everything automatically
      hls.currentLevel = -1;
      setCurrentQuality('Auto');
    } else {
      // Manual quality selection
      hls.currentLevel = qualityIndex;
      const quality = hls.levels[qualityIndex];
      setCurrentQuality(`${quality.height}p`);
    }
    
    setBuffering(true);
    
    // Resume playback after quality switch
    video.currentTime = currentTimeBeforeSwitch;
    if (wasPlaying) {
      setTimeout(() => {
        video.play().catch((err) => console.warn('Resume error:', err.message));
        setBuffering(false);
      }, QUALITY_SWITCH_DELAY);
    } else {
      setBuffering(false);
    }
    
    setShowQualityMenu(false);
  }, []);

  const formatTime = useCallback((timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Memoize formatted times
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime, formatTime]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration, formatTime]);

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
          }, CONTROLS_QUICK_HIDE_DELAY);
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center px-6 max-w-md">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-red-400 text-lg mb-2">{error}</p>
            <p className="text-white/60 text-sm mb-4">
              {STREAM_SOURCE === 'CloudFront' 
                ? 'Unable to load stream from CloudFront. Please check your connection.'
                : 'Unable to load video. The stream may not be available.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }}
                className="px-6 py-2 bg-gold text-black rounded-lg font-semibold hover:bg-gold-light transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
              >
                Reload Page
              </button>
            </div>
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
  {showControls && !isLoading && !controlsDisabled && (
    <motion.div
      ref={controlsRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onMouseEnter={handleControlsMouseEnter}
      onMouseLeave={handleControlsMouseLeave}
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-6 py-4 pt-12"
    >
      {/* --- Progress Bar + Time --- */}
      <div className="flex items-center gap-4 mb-4">
        
        {/* Progress Bar (flex-1 makes it fill the space) */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer hover:h-2.5 transition-all group/progress relative"
        >
          {/* Progress Fill */}
          <div
            className="h-full bg-gold rounded-full"
            // Guard against division by zero in progress fill.

            // style={{ width: `${(currentTime / duration) * 100}%` }}
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          {/* Rounded Head/Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gold rounded-full shadow-lg shadow-gold/50 border-2 border-white transition-transform hover:scale-125"
            
            // Guard against division by zero in thumb positioning.
            // style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
            style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
          />
        </div>

        {/* Time Display */}
        <span className="text-white text-sm font-medium whitespace-nowrap min-w-[80px] text-right">
          {formattedCurrentTime} / {formattedDuration}
        </span>
      </div>

      {/* --- Control Buttons --- */}
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

          {/* Volume Control */}
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
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-0 group-hover/volume:w-20 transition-all accent-gold"
            />
            
            {/* Added Volume Text */}
            <span className="w-0 overflow-hidden opacity-0 group-hover/volume:w-6 group-hover/volume:opacity-100 transition-all text-white text-sm font-medium">
               {Math.round(volume * 100)}
            </span>
          </div>
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
              <span className="text-white text-sm font-semibold">
                {currentQuality}
              </span>
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
                    currentQuality.startsWith("Auto")
                      ? "bg-gold/30 text-gold"
                      : "text-white"
                  }`}
                >
                  Auto
                </button>
                {availableQualities.map((quality) => (
                  <button
                    key={quality.index}
                    onClick={() => changeQuality(quality.index)}
                    className={`w-full px-4 py-2 text-left hover:bg-gold/20 transition-colors ${
                      currentQuality === quality.label
                        ? "bg-gold/30 text-gold"
                        : "text-white"
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

      {/* Toast Notification */}
      <AnimatePresence>
        {showNoAccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="absolute bottom-10 left-1/2 bg-red-500/90 text-white px-5 py-2.5 rounded-xl border border-red-400/20 shadow-2xl z-50 text-sm font-semibold whitespace-nowrap"
          >
            ⚠️ You don't have access
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

HLSVideoPlayer.displayName = 'HLSVideoPlayer';

export default HLSVideoPlayer;