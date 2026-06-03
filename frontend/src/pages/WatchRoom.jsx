import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from 'lucide-react';
import HLSVideoPlayer from '../components/HLSVideoPlayer';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || 'http://localhost:5000';

const CLOUDFRONT_BASE_URL =
  import.meta.env
    .VITE_CLOUDFRONT_BASE_URL ||
  'https://d2k6afcpy0ja0m.cloudfront.net';

const SAMPLE_VIDEO_URL =
  import.meta.env
    .VITE_WATCHROOM_SAMPLE_VIDEO_URL ||
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const SYNC_THRESHOLD = 0.15;
const HEARTBEAT_INTERVAL = 3000;
const BUFFER_DELAY = 200;
const SUPPRESS_EMIT_DURATION = 650;
const PROGRAMMATIC_FLAG_DURATION = 180;

const getIceServers = () => {
  const customTurnUrl = import.meta.env.VITE_TURN_URL;
  const customTurnUser = import.meta.env.VITE_TURN_USERNAME;
  const customTurnCred = import.meta.env.VITE_TURN_CREDENTIAL;
  
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ];

  if (customTurnUrl && customTurnUser && customTurnCred) {
    console.log('[WEBRTC-ICE] Using custom TURN configuration:', customTurnUrl);
    servers.push({
      urls: customTurnUrl,
      username: customTurnUser,
      credential: customTurnCred
    });
  } else {
    console.log('[WEBRTC-ICE] Falling back to public OpenRelay project TURN servers');
    servers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    );
  }
  return servers;
};

const VideoStreamElement = memo(({ stream, isMuted, isSelf }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== stream) {
      console.log(`[VideoStreamElement] Attaching stream. isSelf=${isSelf}, streamId=${stream?.id}`);
      video.srcObject = stream;
    }
  }, [stream, isSelf]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={`w-full h-full object-cover ${isSelf ? 'transform -scale-x-100' : ''}`}
    />
  );
});

const AudioStreamElement = memo(({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.srcObject !== stream) {
      console.log(`[AudioStreamElement] Attaching audio stream. streamId=${stream?.id}`);
      audio.srcObject = stream;
    }
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="hidden"
    />
  );
});

const ChatInputArea = memo(({ onSendMessage, chatSending }) => {
  const [chatInput, setChatInput] = useState('');

  const handleSend = () => {
    const content = chatInput.trim();
    if (!content || chatSending) return;
    onSendMessage(content);
    setChatInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 backdrop-blur-2xl px-4 py-3">
      <div className="flex items-center gap-2 flex-1">
        <input
          type="text"
          placeholder="Type a message..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 outline-none text-white text-sm placeholder:text-white/40 focus:border-gold/50"
        />
        <button
          onClick={handleSend}
          disabled={!chatInput.trim() || chatSending}
          className="px-5 py-1.5 rounded-xl bg-gold text-black text-sm font-semibold hover:bg-gold-light transition shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
});

const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.$oid) return value.$oid;
    if (value._id) return normalizeId(value._id);
  }
  return String(value);
};

const ParticipantCard = memo(({
  participant,
  isSelf,
  inCall,
  isCameraOff,
  isMuted,
  isHandRaised,
  localStream,
  remoteStream,
  currentUser,
  isRoomHost,
  hasControl,
  onGrantControl,
  onRevokeControl
}) => {
  const pId = normalizeId(participant.id || participant._id);
  const hasVideo = isSelf ? (inCall && !isCameraOff && localStream) : (participant.inCall && !participant.isCameraOff && remoteStream);
  const isMutedState = isSelf ? isMuted : participant.isMuted;
  const isHandRaisedState = isSelf ? isHandRaised : participant.isHandRaised;

  return (
    <div
      className="w-full aspect-video rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-3 relative overflow-hidden"
    >
      {/* Bouncing Hand-Raised Badge */}
      {isHandRaisedState && (
        <div className="absolute top-2 right-2 z-30 bg-gold text-black text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce shadow-lg font-bold">
          ✋
        </div>
      )}

      {hasVideo ? (
        <div className="absolute inset-0 w-full h-full bg-black z-0">
          <VideoStreamElement
            stream={isSelf ? localStream : remoteStream}
            isMuted={isSelf}
            isSelf={isSelf}
          />
          
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 border border-white/5">
            <span className="text-[10px] text-white truncate max-w-[120px]">
              {participant.nickName || participant.name} {isSelf && '(You)'}
            </span>
            {isMutedState && (
              <MicOff className="w-3 h-3 text-red-400 shrink-0" />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Render hidden audio element so remote voice is always heard even when camera is off */}
          {!isSelf && participant.inCall && remoteStream && (
            <AudioStreamElement stream={remoteStream} />
          )}

          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1a1f2e] flex items-center justify-center mb-1 border border-white/10 shrink-0 relative">
            {isSelf && currentUser?.profilePicture ? (
              <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : participant?.profilePicture ? (
              <img src={participant.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gold to-yellow-500" />
            )}
            
            {participant.inCall && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <VideoOff className="w-4 h-4 text-white/80" />
              </div>
            )}
          </div>
          
          <p className="text-xs text-white text-center font-medium line-clamp-1">
            {participant.nickName || participant.name}
            {isSelf ? ' (You)' : ''}
          </p>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-[10px] text-green-400">Online</p>
            {participant.inCall && (
              <span className="text-[9px] bg-green-500/20 text-green-300 px-1 py-0.5 rounded border border-green-500/20 font-semibold">
                In Call
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {isMutedState && participant.inCall && (
              <div className="flex items-center gap-0.5 text-red-400 text-[10px]">
                <MicOff className="w-2.5 h-2.5" />
                <span>Muted</span>
              </div>
            )}

            {!isRoomHost && hasControl && (
              <span className="text-[9px] bg-gold/10 text-gold px-1 py-0.5 rounded border border-gold/20 font-semibold">
                Control
              </span>
            )}
          </div>

          {isRoomHost && !isSelf && (
            <button
              onClick={() => hasControl ? onRevokeControl(pId) : onGrantControl(pId)}
              className={`mt-2 text-[9px] px-2 py-0.5 rounded border transition-all ${
                hasControl
                  ? 'bg-gold/20 text-gold border-gold/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-gold/20 hover:text-gold hover:border-gold/30'
              }`}
            >
              {hasControl ? 'Revoke Control' : 'Grant Control'}
            </button>
          )}
        </>
      )}
    </div>
  );
});

const WatchRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [resolvedRoomId, setResolvedRoomId] = useState(roomId);
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [floatingMessages, setFloatingMessages] = useState([]);
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(true);
  const [chatSending, setChatSending] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [canControlPlayback, setCanControlPlayback] = useState(false);
  const [controllerUserIds, setControllerUserIds] = useState([]);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState('');
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [refreshingParticipants, setRefreshingParticipants] = useState(false);

  // WebRTC call states
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  const peerConnectionsRef = useRef(new Map());
  const localStreamRef = useRef(null);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const isProgrammaticRef =
    useRef(false);

  const suppressEmitsUntilRef =
    useRef(0);

  const heartbeatIntervalRef =
    useRef(null);

  const intentionalLeaveRef = useRef(false);
  const lastHeartbeatTimeRef = useRef(0);
  const initialSyncAppliedRef = useRef(false);
  const pendingVideoStateRef = useRef(null);

  // Sync Loop Prevention and Clock Offset Refs
  const expectedProgrammaticSeekTimeRef = useRef(null);
  const expectedProgrammaticPlayRef = useRef(false);
  const expectedProgrammaticPauseRef = useRef(false);
  const clockOffsetRef = useRef(0);
  const lastHostStateRef = useRef({ time: 0, serverTimestamp: 0, isPlaying: false });
  const [videoElement, setVideoElement] = useState(null);

  const playerRefCallback = useCallback((node) => {
    if (node) {
      videoRef.current = node;
      setVideoElement(node.video);
    } else {
      videoRef.current = null;
      setVideoElement(null);
    }
  }, []);

  // Event listeners moved below hasPlaybackControl initialization

  // const currentUser = useMemo(() => {
  //   try {
  //     return JSON.parse(
  //       localStorage.getItem('user') ||
  //       '{}'
  //     );
  //   } catch {
  //     return {};
  //   }
  // }, []);


  const [currentUser, setCurrentUser] =
    useState(
      JSON.parse(
        localStorage.getItem('user') || '{}'
      )
    );

  /* =========================================
     FETCH LATEST USER DATA
  ========================================= */

  useEffect(() => {

    const fetchLatestUser =
      async () => {

        try {

          const token =
            localStorage.getItem(
              'token'
            );

          if (!token) return;

          const response =
            await fetch(
              `${API_URL}/api/auth/me`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
              }
            );

          const data =
            await response.json();

          if (
            data.success &&
            data.user
          ) {

            setCurrentUser(
              data.user
            );

            localStorage.setItem(
              'user',
              JSON.stringify(
                data.user
              )
            );
          }

        } catch (error) {

          console.error(
            'User fetch error:',
            error
          );
        }
      };

    fetchLatestUser();

  }, []);


  const currentUserId =
    currentUser.id || currentUser._id;


  const hostUserId = normalizeId(
    roomData?.host?._id ||
    roomData?.host
  );

  const isRoomHost =
    !!normalizeId(currentUserId) && normalizeId(currentUserId) === hostUserId;
  const hasPlaybackControl = canControlPlayback || isRoomHost;

  // Detect if room movie is a YouTube stream
  const isYoutubeStream = useMemo(() => {
    const folder = roomData?.movie?.videoFolderName;
    return folder && folder.startsWith('yt_');
  }, [roomData?.movie?.videoFolderName]);

  // Extract current YouTube video ID from folder name — used as React key to force remount on video change
  const currentYtVideoId = useMemo(() => {
    const folder = roomData?.movie?.videoFolderName;
    if (!folder || !folder.startsWith('yt_')) return null;
    return folder.replace('yt_', '');
  }, [roomData?.movie?.videoFolderName]);



  // Compute the stream URL for the player
  const streamUrl = useMemo(() => {
    const folder = roomData?.movie?.videoFolderName;
    if (!folder) return SAMPLE_VIDEO_URL;
    if (folder.startsWith('yt_')) {
      // For YouTube: encode as yt_VIDEOID so HLSVideoPlayer can detect it
      // The CLOUDFRONT_BASE_URL path with yt_ prefix triggers isYoutube in the player
      return `${CLOUDFRONT_BASE_URL}/${folder}/master.m3u8`;
    }
    return `${CLOUDFRONT_BASE_URL}/${folder}/master.m3u8`;
  }, [roomData?.movie?.videoFolderName]);


  // Direct Video Element Sync Event Listeners (Bypasses components barriers)
  useEffect(() => {
    if (!videoElement) return undefined;

    const onLocalPlay = () => {
      console.log('[WatchRoom] onLocalPlay triggered. expectedProgrammaticPlay:', expectedProgrammaticPlayRef.current, 'hasPlaybackControl:', hasPlaybackControl);
      if (expectedProgrammaticPlayRef.current) {
        expectedProgrammaticPlayRef.current = false;
        return;
      }
      if (hasPlaybackControl) {
        emitVideoSync('video-play');
      }
    };

    const onLocalPause = () => {
      console.log('[WatchRoom] onLocalPause triggered. expectedProgrammaticPause:', expectedProgrammaticPauseRef.current, 'hasPlaybackControl:', hasPlaybackControl);
      if (expectedProgrammaticPauseRef.current) {
        expectedProgrammaticPauseRef.current = false;
        return;
      }
      if (hasPlaybackControl) {
        emitVideoSync('video-pause');
      }
    };

    const onLocalSeeked = () => {
      console.log('[WatchRoom] onLocalSeeked triggered. expectedProgrammaticSeek:', expectedProgrammaticSeekTimeRef.current, 'hasPlaybackControl:', hasPlaybackControl);
      if (expectedProgrammaticSeekTimeRef.current !== null) {
        const diff = Math.abs(videoElement.currentTime - expectedProgrammaticSeekTimeRef.current);
        if (diff < 0.5) {
          expectedProgrammaticSeekTimeRef.current = null;
          return;
        }
      }
      if (hasPlaybackControl) {
        const socket = socketRef.current;
        if (socket) {
          socket.emit('video-seek', {
            roomId: resolvedRoomId || roomId,
            time: videoElement.currentTime || 0,
            isPlaying: !videoElement.paused,
            clientTimestamp: Date.now()
          });
          console.log(`[EMIT] video-seek: time=${videoElement.currentTime.toFixed(2)}s, isPlaying=${!videoElement.paused}`);
        }
      }
    };

    const onLocalTimeUpdate = () => {
      if (!hasPlaybackControl && lastHostStateRef.current && lastHostStateRef.current.isPlaying) {
        const state = lastHostStateRef.current;
        const elapsed = Math.max(0, (Date.now() + clockOffsetRef.current - state.serverTimestamp) / 1000);
        const estimatedHostTime = state.time + elapsed;
        const currentDrift = videoElement.currentTime - estimatedHostTime;
        const absDrift = Math.abs(currentDrift);
        
        if (absDrift < 0.05) {
          if (videoElement.playbackRate !== 1.0) {
            videoElement.playbackRate = 1.0;
            console.log(`[SYNC-SPEED] Re-aligned! Drift is ${currentDrift.toFixed(3)}s. Resetting speed to 1.0`);
          }
        } else if (absDrift <= 1.5) {
          const targetRate = currentDrift < 0 ? 1.05 : 0.95;
          if (videoElement.playbackRate !== targetRate) {
            videoElement.playbackRate = targetRate;
            console.log(`[SYNC-SPEED] Adjusting speed to ${targetRate} (drift: ${currentDrift.toFixed(3)}s)`);
          }
        } else {
          console.log(`[SYNC-SPEED] Drift too large (${currentDrift.toFixed(3)}s), performing hard seek`);
          isProgrammaticRef.current = true;
          expectedProgrammaticSeekTimeRef.current = estimatedHostTime;
          videoElement.currentTime = estimatedHostTime;
          videoElement.playbackRate = 1.0;
          setTimeout(() => {
            isProgrammaticRef.current = false;
          }, PROGRAMMATIC_FLAG_DURATION);
        }
      }
    };

    videoElement.addEventListener('play', onLocalPlay);
    videoElement.addEventListener('pause', onLocalPause);
    videoElement.addEventListener('seeked', onLocalSeeked);
    videoElement.addEventListener('timeupdate', onLocalTimeUpdate);

    return () => {
      videoElement.removeEventListener('play', onLocalPlay);
      videoElement.removeEventListener('pause', onLocalPause);
      videoElement.removeEventListener('seeked', onLocalSeeked);
      videoElement.removeEventListener('timeupdate', onLocalTimeUpdate);
    };
  }, [videoElement, hasPlaybackControl, resolvedRoomId, roomId]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!document.fullscreenElement) {
        setShowParticipantsSidebar(true);
        return;
      }

      const triggerZone =
        window.innerWidth - 120;

      setShowParticipantsSidebar(
        e.clientX >= triggerZone
      );
    };

    window.addEventListener(
      'mousemove',
      handleMouseMove
    );

    return () => {
      window.removeEventListener(
        'mousemove',
        handleMouseMove
      );
    };
  }, []);

  const applyRemoteVideoState =
    async (
      video,
      state,
      forceSync = false
    ) => {
      if (!video || !state) return;

      isProgrammaticRef.current =
        true;

      suppressEmitsUntilRef.current =
        Date.now() +
        SUPPRESS_EMIT_DURATION;

      const targetTime = Number(
        state.currentTime || 0
      );

      const currentTime =
        video.currentTime;

      const drift = Math.abs(
        currentTime - targetTime
      );

      if (
        forceSync ||
        drift > SYNC_THRESHOLD
      ) {
        if (
          Number.isFinite(targetTime)
        ) {
          video.currentTime =
            targetTime;
        }
      }

      if (
        state.isPlaying &&
        video.paused
      ) {
        try {
          await video.play();
        } catch { }
      } else if (
        !state.isPlaying &&
        !video.paused
      ) {
        video.pause();
      }

      setTimeout(() => {
        isProgrammaticRef.current =
          false;
      }, PROGRAMMATIC_FLAG_DURATION);
    };

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(
        heartbeatIntervalRef.current
      );
    }

    heartbeatIntervalRef.current = setInterval(() => {
      const socket = socketRef.current;
      const video = videoRef.current?.video;
      
      if (!socket || !video || !hasPlaybackControl) return;
      if (isProgrammaticRef.current) return;
      if (Date.now() < suppressEmitsUntilRef.current) return;

      // Only send heartbeat if video is playing
      if (!video.paused) {
        socket.emit('video-heartbeat', {
          roomId: resolvedRoomId || roomId,
          time: video.currentTime || 0,
          isPlaying: !video.paused
        });
        lastHeartbeatTimeRef.current = Date.now();
        console.log(`[HEARTBEAT] Sent: time=${video.currentTime.toFixed(2)}s`);
      }
    }, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(
        heartbeatIntervalRef.current
      );

      heartbeatIntervalRef.current =
        null;
    }
  };

  const leaveRoomNow = () => {
    const socket =
      socketRef.current;

    stopHeartbeat();
    cleanupAllConnections();

    if (socket) {
      socket.emit(
        'leave-room',
        {
          roomId:
            resolvedRoomId ||
            roomId,
          userId:
            normalizeId(
              currentUserId
            ),
        }
      );

      socket.disconnect();
    }
  };

  const cleanupAllConnections = () => {
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    setRemoteStreams({});
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  };

  const createPeerConnection = (peerId, isInitiator) => {
    console.log(`[WEBRTC] createPeerConnection for peer=${peerId}, isInitiator=${isInitiator}`);
    if (peerConnectionsRef.current.has(peerId)) {
      console.log(`[WEBRTC] Closing existing peer connection with ${peerId}`);
      peerConnectionsRef.current.get(peerId).close();
      peerConnectionsRef.current.delete(peerId);
    }

    const servers = getIceServers();
    console.log(`[WEBRTC] Initializing RTCPeerConnection for peer=${peerId} with servers:`, servers);
    const pc = new RTCPeerConnection({ iceServers: servers });

    // Track states
    pc.onconnectionstatechange = () => {
      console.log(`[WEBRTC] PeerConnection(${peerId}) connectionState changed: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        console.error(`[WEBRTC] PeerConnection(${peerId}) failed. NAT traversal may have failed.`);
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`[WEBRTC] PeerConnection(${peerId}) disconnected.`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WEBRTC] PeerConnection(${peerId}) iceConnectionState changed: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        console.error(`[WEBRTC] PeerConnection(${peerId}) ICE Connection failed. TURN server might be unreachable or misconfigured.`);
      }
    };

    pc.ongatheringstatechange = () => {
      console.log(`[WEBRTC] PeerConnection(${peerId}) iceGatheringState changed: ${pc.iceGatheringState}`);
    };

    // Add local tracks
    if (localStreamRef.current) {
      console.log(`[WEBRTC] Adding local tracks to peer connection for peer=${peerId}`);
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      console.warn(`[WEBRTC] No local stream found while creating peer connection for peer=${peerId}`);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WEBRTC] Generated ICE candidate for peer=${peerId}:`, event.candidate.candidate);
        if (socketRef.current) {
          socketRef.current.emit('webrtc:signal', {
            targetUserId: peerId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      } else {
        console.log(`[WEBRTC] ICE Candidate Gathering complete for peer=${peerId}`);
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WEBRTC] ontrack fired from peer=${peerId}`);
      if (event.streams && event.streams[0]) {
        console.log(`[WEBRTC] Remote stream received from peer=${peerId}: ID=${event.streams[0].id}`);
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: event.streams[0]
        }));
      } else {
        console.warn(`[WEBRTC] ontrack fired from peer=${peerId} but no streams exist in event!`);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          console.log(`[WEBRTC] Negotiation needed for peer=${peerId}. Creating offer...`);
          const offer = await pc.createOffer();
          console.log(`[WEBRTC] offer created for peer=${peerId}:`, offer);
          await pc.setLocalDescription(offer);
          console.log(`[WEBRTC] setLocalDescription (offer) success for peer=${peerId}`);
          
          if (socketRef.current) {
            console.log(`[WEBRTC] Sending offer to peer=${peerId}`);
            socketRef.current.emit('webrtc:signal', {
              targetUserId: peerId,
              signal: pc.localDescription
            });
          }
        } catch (err) {
          console.error(`[WEBRTC] createOffer/setLocalDescription error for peer=${peerId}:`, err);
        }
      };
    }

    return pc;
  };

  const joinVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);
      
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !isMuted;
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !isCameraOff;

      if (socketRef.current) {
        socketRef.current.emit('call:state-change', {
          roomId: resolvedRoomId || roomId,
          inCall: true,
          isMuted,
          isCameraOff,
          isHandRaised: false
        });
      }
    } catch (err) {
      console.error('[WEBRTC] Media device access failed:', err);
      alert('Unable to access camera and microphone. Please check permissions.');
    }
  };

  const leaveVideoCall = () => {
    setInCall(false);
    setIsHandRaised(false);
    cleanupAllConnections();
    if (socketRef.current) {
      socketRef.current.emit('call:state-change', {
        roomId: resolvedRoomId || roomId,
        inCall: false,
        isMuted: true,
        isCameraOff: true,
        isHandRaised: false
      });
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !nextMute;
    }
    if (socketRef.current) {
      socketRef.current.emit('call:state-change', {
        roomId: resolvedRoomId || roomId,
        inCall: true,
        isMuted: nextMute,
        isCameraOff,
        isHandRaised
      });
    }
  };

  const toggleCamera = () => {
    const nextCameraOff = !isCameraOff;
    setIsCameraOff(nextCameraOff);
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !nextCameraOff;
    }
    if (socketRef.current) {
      socketRef.current.emit('call:state-change', {
        roomId: resolvedRoomId || roomId,
        inCall: true,
        isMuted,
        isCameraOff: nextCameraOff,
        isHandRaised
      });
    }
  };

  const toggleHand = () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    if (socketRef.current) {
      socketRef.current.emit('call:state-change', {
        roomId: resolvedRoomId || roomId,
        inCall,
        isMuted,
        isCameraOff,
        isHandRaised: nextHand
      });
    }

    if (nextHand) {
      setTimeout(() => {
        setIsHandRaised(prev => {
          if (prev) {
            if (socketRef.current) {
              socketRef.current.emit('call:state-change', {
                roomId: resolvedRoomId || roomId,
                inCall,
                isMuted,
                isCameraOff,
                isHandRaised: false
              });
            }
            return false;
          }
          return prev;
        });
      }, 6000);
    }
  };

  // Peer Connection Synchronizer
  useEffect(() => {
    if (!inCall) {
      return;
    }

    activeUsers.forEach(user => {
      const peerId = normalizeId(user.id || user._id);
      if (peerId === normalizeId(currentUserId)) return;
      if (!user.inCall) return;

      const pc = peerConnectionsRef.current.get(peerId);
      if (!pc) {
        const isInitiator = normalizeId(currentUserId) < peerId;
        console.log(`[WEBRTC] Establishing connection to ${user.nickName || user.name}. Initiator: ${isInitiator}`);
        createPeerConnection(peerId, isInitiator);
      }
    });

    const activeCallUserIds = new Set(
      activeUsers.filter(u => u.inCall).map(u => normalizeId(u.id || u._id))
    );
    peerConnectionsRef.current.forEach((pc, peerId) => {
      if (!activeCallUserIds.has(peerId)) {
        console.log(`[WEBRTC] Closing connection with ${peerId} (left call/room)`);
        pc.close();
        peerConnectionsRef.current.delete(peerId);
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    });
  }, [inCall, activeUsers]);

  const openLeaveConfirmation = (
    targetPath =
      '/watch-together'
  ) => {
    setPendingNavigationPath(
      targetPath
    );

    setShowLeaveConfirmModal(true);
  };

  const cancelLeave = () => {
    setShowLeaveConfirmModal(false);
  };

  const confirmLeave = () => {
    intentionalLeaveRef.current =
      true;

    leaveRoomNow();

    navigate(
      pendingNavigationPath ||
      '/watch-together'
    );
  };

  useEffect(() => {
    const token =
      localStorage.getItem('token');

    if (!token || !roomId) return;

    const fetchRoom = async () => {
      try {
        setLoadingRoom(true);

        const response = await fetch(
          `${API_URL}/api/rooms/${roomId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message
          );
        }

        setRoomData(data.room);

        setResolvedRoomId(
          normalizeId(
            data.room?._id ||
            roomId
          )
        );

        setChatMessages(
          data.room?.messages ||
          []
        );
      } catch (error) {
        setRoomError(
          error.message
        );
      } finally {
        setLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // Setup video source (HLS or fallback)
  useEffect(() => {
    const video = videoRef.current?.video;
    if (!video) return undefined;

    const folder = roomData?.movie?.videoFolderName;
    const isYoutube = folder && folder.startsWith('yt_');
    if (isYoutube) return undefined;

    const hlsUrl = folder ? `${CLOUDFRONT_BASE_URL}/${folder}/master.m3u8` : null;

    // Cleanup any previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setVideoError('');

    if (!hlsUrl) {
      video.src = SAMPLE_VIDEO_URL;
      return undefined;
    }

    // Use native HLS on Safari
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      return undefined;
    }

    // Use Hls.js on other browsers
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1,
        autoStartLoad: true,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setVideoError('Unable to load selected movie stream. Playing fallback sample.');
          hls.destroy();
          hlsRef.current = null;
          video.src = SAMPLE_VIDEO_URL;
        }
      });
    } else {
      setVideoError('HLS is not supported in this browser. Playing fallback sample.');
      video.src = SAMPLE_VIDEO_URL;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [roomData?.movie?.videoFolderName]);


  // Socket.IO connection and event handlers
  useEffect(() => {
    const token =
      localStorage.getItem('token');

    if (!token || !roomId)
      return undefined;

    const socket = io(
      API_URL,
      {
        auth: { token },
        transports: [
          'websocket',
          'polling',
        ],
      }
    );

    socketRef.current = socket;

    const myId =
      currentUser.id ||
      currentUser._id;

    const myName =
      currentUser.nickName ||
      currentUser.name ||
      'You';

    const syncClock = () => {
      if (socket && socket.connected) {
        socket.emit('sync:ping', { clientTime: Date.now() });
      }
    };

    let clockSyncInterval = null;

    socket.on('connect', () => {
      socket.emit(
        'join-room',
        {
          roomId,
          user: {
            id: currentUser?.id || currentUser?._id,
            name: currentUser?.name,
            nickName: currentUser?.nickName,
            profilePicture: currentUser?.profilePicture,
          },
        }
      );
      syncClock();
      clockSyncInterval = setInterval(syncClock, 15000);
      
      // Proactively sync on reconnect
      socket.emit('video-sync-request', { roomId });
    });

    socket.on('sync:pong', (data) => {
      const { clientTime, serverTime } = data;
      const now = Date.now();
      const rtt = now - clientTime;
      const offset = serverTime - (clientTime + now) / 2;
      clockOffsetRef.current = offset;
      console.log(`[SYNC-CLOCK] RTT: ${rtt}ms, Clock Offset: ${offset}ms`);
    });

    socket.on(
      'room-users',
      (payload) => {
        setActiveUsers(
          payload?.users || []
        );
      }
    );

    socket.on(
      'room-joined',
      (payload) => {
        if (
          payload?.permissions
        ) {
          const controllers =
            payload.permissions
              .controllers || [];

          setControllerUserIds(
            controllers
          );

          setCanControlPlayback(
            controllers.includes(
              normalizeId(
                currentUserId
              )
            )
          );
        }

      if (payload?.videoState) {
        initialSyncAppliedRef.current = true;
        pendingVideoStateRef.current = payload.videoState;
        const video = videoRef.current?.video;
        if (video) {
          if (video.readyState >= 1) {
            applyRemoteVideoState(video, payload.videoState, true); // Force initial sync
            pendingVideoStateRef.current = null;
          } else {
            const onLoaded = () => {
              if (pendingVideoStateRef.current) {
                applyRemoteVideoState(video, pendingVideoStateRef.current, true);
                pendingVideoStateRef.current = null;
              }
            };
            video.addEventListener('loadedmetadata', onLoaded, { once: true });
          }
        }
      }
      
      // FORCE REQUEST PARTICIPANTS after room-joined
      setTimeout(() => {
        console.log('[WATCH ROOM] Force requesting participants after room-joined');
        socket.emit('request-room-users', { roomId: payload?.roomId || roomId });
      }, 300);
    });

    socket.on('user-connected', (payload) => {
      console.log('[WATCH ROOM] User connected:', payload);
      const incomingUser = payload?.user || payload;
      const incomingId = incomingUser?.id || incomingUser?._id;
      if (!incomingId) return;

      setActiveUsers((prev) => {
        const exists = prev.some((u) => (u.id || u._id) === incomingId);
        if (exists) return prev;
        console.log('[WATCH ROOM] Adding user to local state:', incomingUser.nickName || incomingUser.name);
        return [...prev, incomingUser];
      });
    });

    socket.on('room-users', (payload) => {
      const users = Array.isArray(payload?.users) ? payload.users : [];
      const validUsers = users.filter(u => u && (u.id || u._id));
      setActiveUsers(validUsers);
    });

    socket.on('playback:control-state', (payload) => {
      const controllers = Array.isArray(payload?.controllers)
        ? payload.controllers.map((id) => normalizeId(id))
        : [];

      setControllerUserIds(controllers);
      const hasControl = controllers.includes(normalizeId(currentUserId));
      setCanControlPlayback(hasControl);
    });

    socket.on('user-disconnected', (payload) => {
      console.log('[WATCH ROOM] User disconnected:', payload);
      const leavingId = payload?.userId || payload?.id || payload?._id;
      if (!leavingId) return;
      setActiveUsers((prev) => {
        const filtered = prev.filter((u) => (u.id || u._id) !== leavingId);
        console.log('[WATCH ROOM] User removed. Remaining:', filtered.length);
        return filtered;
      });
    });

    socket.on('watch:change-source', (payload) => {
      console.log('[WATCH ROOM] Source changed:', payload);
      const { youtubeVideoId } = payload;
      if (!youtubeVideoId) return;
      setRoomData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          movie: {
            ...(prev.movie || {}),
            videoFolderName: `yt_${youtubeVideoId}`,
          }
        };
      });
    });

    socket.on('watch:message:received', (payload) => {
      const incomingMessage = payload?.message;
      if (!incomingMessage?._id) return;

      setChatMessages((prev) => {
        const exists = prev.some((m) => normalizeId(m._id) === normalizeId(incomingMessage._id));
        if (exists) return prev;
        return [...prev, incomingMessage];
      });

      const senderId = incomingMessage.sender?.id || incomingMessage.sender?._id || incomingMessage.sender;
      const senderName = incomingMessage.sender
        ? (normalizeId(senderId) === normalizeId(currentUserId)
          ? 'You'
          : (incomingMessage.sender.nickName || incomingMessage.sender.name || 'User'))
        : 'User';

      const newId = incomingMessage._id || Math.random().toString();
      const newFloatingMsg = {
        id: newId,
        sender: senderName,
        content: incomingMessage.content,
      };

      setFloatingMessages((prev) => [...prev, newFloatingMsg]);

      setTimeout(() => {
        setFloatingMessages((prev) => prev.filter((msg) => msg.id !== newId));
      }, 3000);
    });

    /**
     * IMPROVED: video-play handler with clock compensation and loop prevention
     */
    socket.on('video-play', async (payload) => {
      const video = videoRef.current?.video;
      if (!video) return;
      
      const serverTimestamp = Number(payload?.serverTimestamp);
      const targetTime = Number(payload?.time);
      const bufferDelay = payload?.bufferDelay || BUFFER_DELAY;

      // Compensate for network transit time
      let compensatedTime = targetTime;
      if (serverTimestamp) {
        const elapsed = Math.max(0, (Date.now() + clockOffsetRef.current - serverTimestamp) / 1000);
        compensatedTime += elapsed;
      }

      // Update host state ref
      lastHostStateRef.current = {
        time: targetTime,
        serverTimestamp: serverTimestamp || Date.now(),
        isPlaying: true
      };

      isProgrammaticRef.current = true;
      suppressEmitsUntilRef.current = Date.now() + SUPPRESS_EMIT_DURATION;

      const drift = Math.abs(video.currentTime - compensatedTime);
      if (Number.isFinite(compensatedTime) && drift > SYNC_THRESHOLD) {
        expectedProgrammaticSeekTimeRef.current = compensatedTime;
        video.currentTime = compensatedTime;
      }

      // Buffer before playing for smooth sync
      setTimeout(async () => {
        try {
          if (video.paused) {
            expectedProgrammaticPlayRef.current = true;
            await video.play();
          }
          console.log(`[SYNC] Play received: time=${compensatedTime.toFixed(2)}s`);
        } catch (err) {
          console.warn('[SYNC] Play failed:', err.message);
          expectedProgrammaticPlayRef.current = false;
        }
        
        setTimeout(() => {
          isProgrammaticRef.current = false;
        }, PROGRAMMATIC_FLAG_DURATION);
      }, bufferDelay);
    });

    /**
     * IMPROVED: video-pause handler
     */
    socket.on('video-pause', (payload) => {
      const video = videoRef.current?.video;
      if (!video) return;
      
      const targetTime = Number(payload?.time);
      const serverTimestamp = Number(payload?.serverTimestamp);

      // Update host state ref
      lastHostStateRef.current = {
        time: targetTime,
        serverTimestamp: serverTimestamp || Date.now(),
        isPlaying: false
      };

      isProgrammaticRef.current = true;
      suppressEmitsUntilRef.current = Date.now() + SUPPRESS_EMIT_DURATION;

      const drift = Math.abs(video.currentTime - targetTime);
      if (Number.isFinite(targetTime) && drift > SYNC_THRESHOLD) {
        expectedProgrammaticSeekTimeRef.current = targetTime;
        video.currentTime = targetTime;
      }
      
      if (!video.paused) {
        expectedProgrammaticPauseRef.current = true;
        video.pause();
      }
      console.log(`[SYNC] Pause received: time=${targetTime.toFixed(2)}s`);

      setTimeout(() => {
        isProgrammaticRef.current = false;
      }, PROGRAMMATIC_FLAG_DURATION);
    });

    /**
     * IMPROVED: video-seek handler
     */
    socket.on('video-seek', async (payload) => {
      const video = videoRef.current?.video;
      if (!video) return;
      
      const serverTimestamp = Number(payload?.serverTimestamp);
      const targetTime = Number(payload?.time);
      const isPlayingNow = !!payload?.isPlaying;
      if (!Number.isFinite(targetTime)) return;

      // Compensate seek time if playing
      let compensatedTime = targetTime;
      if (isPlayingNow && serverTimestamp) {
        const elapsed = Math.max(0, (Date.now() + clockOffsetRef.current - serverTimestamp) / 1000);
        compensatedTime += elapsed;
      }

      // Update host state ref
      lastHostStateRef.current = {
        time: targetTime,
        serverTimestamp: serverTimestamp || Date.now(),
        isPlaying: isPlayingNow
      };

      isProgrammaticRef.current = true;
      suppressEmitsUntilRef.current = Date.now() + SUPPRESS_EMIT_DURATION;

      // Force update position
      expectedProgrammaticSeekTimeRef.current = compensatedTime;
      video.currentTime = compensatedTime;

      // Match play/pause state
      if (isPlayingNow) {
        if (video.paused) {
          expectedProgrammaticPlayRef.current = true;
          try {
            await video.play();
          } catch (e) {
            expectedProgrammaticPlayRef.current = false;
          }
        }
      } else {
        if (!video.paused) {
          expectedProgrammaticPauseRef.current = true;
          video.pause();
        }
      }

      console.log(`[SYNC] Seek received: time=${compensatedTime.toFixed(2)}s, playing=${isPlayingNow}`);

      setTimeout(() => {
        isProgrammaticRef.current = false;
      }, PROGRAMMATIC_FLAG_DURATION);
    });

    /**
     * IMPROVED: video-heartbeat handler with dynamic speed alignment
     */
    socket.on('video-heartbeat', (payload) => {
      const video = videoRef.current?.video;
      if (!video) return;

      const serverTimestamp = Number(payload?.serverTimestamp);
      const targetTime = Number(payload?.time || 0);
      const isPlayingNow = !!payload?.isPlaying;

      // Update last known host state
      lastHostStateRef.current = {
        time: targetTime,
        serverTimestamp: serverTimestamp || Date.now(),
        isPlaying: isPlayingNow
      };

      let compensatedTime = targetTime;
      if (isPlayingNow && serverTimestamp) {
        const elapsed = Math.max(0, (Date.now() + clockOffsetRef.current - serverTimestamp) / 1000);
        compensatedTime += elapsed;
      }

      const currentTime = video.currentTime;
      const drift = Math.abs(currentTime - compensatedTime);

      if (drift > 1.5) {
        console.log(`[SYNC] Heartbeat corrected (Hard seek): local=${currentTime.toFixed(2)}s, target=${compensatedTime.toFixed(2)}s (drift=${drift.toFixed(2)}s)`);
        isProgrammaticRef.current = true;
        expectedProgrammaticSeekTimeRef.current = compensatedTime;
        video.currentTime = compensatedTime;
        video.playbackRate = 1.0;
        setTimeout(() => {
          isProgrammaticRef.current = false;
        }, PROGRAMMATIC_FLAG_DURATION);
      } else if (drift > 0.05) {
        // Dynamic speed tuning
        const targetRate = currentTime < compensatedTime ? 1.05 : 0.95;
        if (video.playbackRate !== targetRate) {
          video.playbackRate = targetRate;
          console.log(`[SYNC-SPEED] Heartbeat speed adjust: targetRate=${targetRate} (drift=${(currentTime - compensatedTime).toFixed(3)}s)`);
        }
      } else {
        if (video.playbackRate !== 1.0) {
          video.playbackRate = 1.0;
        }
      }

      if (isPlayingNow && video.paused) {
        expectedProgrammaticPlayRef.current = true;
        video.play().catch(() => {
          expectedProgrammaticPlayRef.current = false;
        });
      } else if (!isPlayingNow && !video.paused) {
        expectedProgrammaticPauseRef.current = true;
        video.pause();
        video.playbackRate = 1.0;
      }
    });

    socket.on('webrtc:signal', async (payload) => {
      const { senderUserId, signal } = payload;
      let pc = peerConnectionsRef.current.get(senderUserId);
      
      console.log(`[WEBRTC] Received signal from peer=${senderUserId}: type=${signal ? (signal.type || 'candidate') : 'undefined'}`);

      try {
        if (signal.type === 'offer') {
          console.log(`[WEBRTC] Processing offer from peer=${senderUserId}`);
          if (!pc) {
            console.log(`[WEBRTC] PeerConnection for peer=${senderUserId} does not exist, creating one...`);
            pc = createPeerConnection(senderUserId, false);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log(`[WEBRTC] setRemoteDescription (offer) success for peer=${senderUserId}`);
          
          console.log(`[WEBRTC] Creating answer for peer=${senderUserId}...`);
          const answer = await pc.createAnswer();
          console.log(`[WEBRTC] Answer created for peer=${senderUserId}:`, answer);
          await pc.setLocalDescription(answer);
          console.log(`[WEBRTC] setLocalDescription (answer) success for peer=${senderUserId}`);
          
          console.log(`[WEBRTC] Sending answer to peer=${senderUserId}`);
          socket.emit('webrtc:signal', {
            targetUserId: senderUserId,
            signal: pc.localDescription
          });
        } else if (signal.type === 'answer') {
          console.log(`[WEBRTC] Processing answer from peer=${senderUserId}`);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            console.log(`[WEBRTC] setRemoteDescription (answer) success for peer=${senderUserId}`);
          } else {
            console.warn(`[WEBRTC] Received answer from peer=${senderUserId} but no PeerConnection existed!`);
          }
        } else if (signal.type === 'candidate') {
          console.log(`[WEBRTC] Processing candidate from peer=${senderUserId}`);
          if (pc && signal.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
              console.log(`[WEBRTC] addIceCandidate success for peer=${senderUserId}`);
            } catch (candErr) {
              console.error(`[WEBRTC] addIceCandidate error for peer=${senderUserId}:`, candErr);
            }
          } else {
            console.warn(`[WEBRTC] Received candidate for peer=${senderUserId} but peerConnection is ${pc ? 'exists' : 'null'} and candidate is ${signal.candidate ? 'exists' : 'null'}`);
          }
        }
      } catch (err) {
        console.error(`[WEBRTC] error handling signal from peer=${senderUserId}:`, err);
      }
    });

    // Listen to online events to proactively request state from backend when internet returns
    const handleOnline = () => {
      console.log('[WATCH] Internet connection recovered, requesting immediate sync');
      socket.emit('video-sync-request', { roomId });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      stopHeartbeat();
      cleanupAllConnections();
      window.removeEventListener('online', handleOnline);
      if (clockSyncInterval) clearInterval(clockSyncInterval);
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (hasPlaybackControl) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [hasPlaybackControl, resolvedRoomId, roomId]);

  // Debug: Log whenever activeUsers changes
  useEffect(() => {
    console.log('[WATCH ROOM] *** activeUsers state changed ***');
    console.log('[WATCH ROOM] New count:', activeUsers.length);
    console.log('[WATCH ROOM] Users:', activeUsers.map(u => u.nickName || u.name).join(', '));
  }, [activeUsers]);

  useEffect(() => {
    const handleAnchorNavigation = (event) => {
      if (intentionalLeaveRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      const targetUrl = new URL(href, window.location.origin);
      if (targetUrl.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      if (targetPath === currentPath) return;

      event.preventDefault();
      openLeaveConfirmation(targetPath);
    };

    document.addEventListener('click', handleAnchorNavigation, true);
    return () => {
      document.removeEventListener('click', handleAnchorNavigation, true);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (intentionalLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = 'If you go to another page, you will exit the room.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (intentionalLeaveRef.current) return;
      window.history.pushState({ watchRoomGuard: true }, '', window.location.href);
      openLeaveConfirmation('/watch-together');
    };

    window.history.pushState({ watchRoomGuard: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset initial sync flag on room change
  useEffect(() => {
    initialSyncAppliedRef.current = false;
  }, [roomId]);


  // Apply initial video state from room data
  useEffect(() => {
    const video = videoRef.current?.video;
    const state = roomData?.videoState;
    if (!video || !state) return;
    if (initialSyncAppliedRef.current) return;

    const applyInitialState = async () => {
      initialSyncAppliedRef.current = true;
      await applyRemoteVideoState(video, {
        currentTime: state.currentTime || 0,
        isPlaying: !!state.isPlaying,
      }, true); // Force initial sync
    };

    const onLoadedMetadata = () => {
      applyInitialState();
    };

    if (video.readyState >= 1) {
      applyInitialState();
    } else {
      video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [roomData?.videoState?.currentTime, roomData?.videoState?.isPlaying]);

  // Helper functions
  const getSenderName = (sender) => {
    if (!sender) return 'Unknown';
    if (typeof sender === 'string') return normalizeId(sender) === normalizeId(currentUserId) ? 'You' : 'User';
    return sender.nickName || sender.name || 'User';
  };



  const handleSendMessage = useCallback(
    async (content) => {
      if (
        !content ||
        !socketRef.current
      )
        return;

      setChatSending(true);

      socketRef.current.emit(
        'watch:message:send',
        {
          roomId:
            resolvedRoomId ||
            roomId,
          content,
        },
        () => {
          setChatSending(false);
        }
      );
    },
    [resolvedRoomId, roomId]
  );

  /**
   * IMPROVED: Emit video sync events with timestamp for race condition prevention
   */
  const emitVideoSync = (eventName) => {
    const socket = socketRef.current;
    const video = videoRef.current?.video;
    if (!socket || !video) return;
    if (isProgrammaticRef.current) return;
    if (Date.now() < suppressEmitsUntilRef.current) return;
    if (!hasPlaybackControl) return;

    socket.emit(eventName, {
      roomId: resolvedRoomId || roomId,
      time: video.currentTime || 0,
      clientTimestamp: Date.now() // For race condition prevention
    });

    console.log(`[EMIT] ${eventName}: time=${video.currentTime.toFixed(2)}s`);
  };

  const handleVideoPlay = () => emitVideoSync('video-play');
  const handleVideoPause = () => emitVideoSync('video-pause');
  const handleVideoSeeked = () => emitVideoSync('video-seek');

  // Removed the aggressive timeupdate sync - heartbeat handles it now

  const isCurrentUser = (user) => {
    const userId = user?.id || user?._id;
    return normalizeId(userId) === normalizeId(currentUserId);
  };

  const canUserControlPlayback =
    (user) => {
      const targetId =
        normalizeId(
          user?.id ||
          user?._id
        );

      return controllerUserIds.includes(
        targetId
      );
    };

  const handleGrantControl = (
    targetUserId
  ) => {
    socketRef.current.emit(
      'playback:grant-control',
      {
        roomId:
          resolvedRoomId ||
          roomId,
        targetUserId,
      }
    );
  };

  const handleRevokeControl = (
    targetUserId
  ) => {
    socketRef.current.emit(
      'playback:revoke-control',
      {
        roomId:
          resolvedRoomId ||
          roomId,
        targetUserId,
      }
    );
  };

  const handleToggleAllControl = (allow) => {
    activeUsers.forEach(u => {
      const uId = normalizeId(u.id || u._id);
      if (uId === hostUserId) return;
      if (allow) {
        handleGrantControl(uId);
      } else {
        handleRevokeControl(uId);
      }
    });
  };

  if (loadingRoom) {
    return (
      <div className="
        min-h-screen
        bg-black
        text-white
        flex items-center justify-center
      ">
        Loading room...
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="
        min-h-screen
        bg-black
        text-white
        flex items-center justify-center
      ">
        {roomError}
      </div>
    );
  }


  /* =========================================================
     WATCH ROOM
     PREMIUM WATCH PARTY UI
     ---------------------------------------------------------
     FEATURES:
     ✔ Video Sync
     ✔ Floating Chat Messages
     ✔ Fullscreen Hover Participants
     ✔ Bigger Video Area
     ✔ Square Participant Cards
     ✔ Bottom Chat Input
     ✔ Modern Glassmorphism UI
     ========================================================= */

  return (
    <div className="min-h-screen bg-[#05070d] text-white p-3 overflow-hidden">
      <div className="h-[calc(100vh-24px)] flex flex-col gap-3">
        <div className="flex-1 flex gap-3 min-h-0">
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <section className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-black min-h-0">
              <HLSVideoPlayer
                key={currentYtVideoId || 'hls'}
                ref={playerRefCallback}
                streamUrl={streamUrl}
                movieTitle={roomData?.movie?.Title || roomData?.name || 'Watch Together'}
                posterUrl={roomData?.movie?.Poster && roomData.movie.Poster !== 'N/A' ? roomData.movie.Poster : undefined}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onSeeked={handleVideoSeeked}
                controlsDisabled={!hasPlaybackControl}
              />
              
              <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-5 bg-gradient-to-b from-black/90 to-transparent">
                <div>
                  <h1 className="text-2xl font-bold">Watch Room</h1>
                  <p className="text-sm text-white/60 mt-1">
                    Watch Party <span className="text-gold font-semibold">{roomData?.roomCode || roomData?.code || roomId}</span>
                  </p>
                </div>
                <button
                  onClick={() => openLeaveConfirmation('/watch-together')}
                  className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
                >
                  Leave
                </button>
              </div>

              <div className="absolute left-5 bottom-20 z-40 flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                  {floatingMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 100, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -250, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="max-w-sm rounded-2xl border border-white/10 bg-black/30 backdrop-blur-2xl px-4 py-3 shadow-2xl"
                    >
                      <p className="text-gold text-xs font-bold mb-1">{msg.sender}</p>
                      <p className="text-white text-sm break-words">{msg.content}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <ChatInputArea onSendMessage={handleSendMessage} chatSending={chatSending} />
          </div>

          <AnimatePresence>
            {showParticipantsSidebar && (
              <motion.aside
                initial={{ x: 320 }}
                animate={{ x: 0 }}
                exit={{ x: 320 }}
                transition={{ duration: 0.3 }}
                className="w-[290px] rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl p-4 flex flex-col shrink-0 min-h-0"
              >
                <div className="flex flex-col gap-2 mb-5 pb-3 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Participants</h2>
                    <span className="text-xs text-white/50">{activeUsers.length} online</span>
                  </div>
                  {isRoomHost && (
                    <div className="flex items-center justify-between mt-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                      <span className="text-xs text-white/80 font-medium">Co-control Playback</span>
                      <button
                        onClick={() => {
                          const anyParticipantHasControl = activeUsers.some(u => {
                            const uId = normalizeId(u.id || u._id);
                            return uId !== hostUserId && canUserControlPlayback(u);
                          });
                          handleToggleAllControl(!anyParticipantHasControl);
                        }}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                          activeUsers.some(u => normalizeId(u.id || u._id) !== hostUserId && canUserControlPlayback(u))
                            ? 'bg-gold'
                            : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`bg-black w-4 h-4 rounded-full shadow-md transform duration-300 ${
                            activeUsers.some(u => normalizeId(u.id || u._id) !== hostUserId && canUserControlPlayback(u))
                              ? 'translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0 pr-1">
                  {activeUsers.map((participant, index) => {
                    const pId = normalizeId(participant.id || participant._id);
                    const isSelf = isCurrentUser(participant);
                    const hasControl = canUserControlPlayback(participant);
                    return (
                      <ParticipantCard
                        key={pId || index}
                        participant={participant}
                        isSelf={isSelf}
                        inCall={inCall}
                        isCameraOff={isCameraOff}
                        isMuted={isMuted}
                        isHandRaised={isHandRaised}
                        localStream={localStream}
                        remoteStream={remoteStreams[pId]}
                        currentUser={currentUser}
                        isRoomHost={isRoomHost}
                        hasControl={hasControl}
                        onGrantControl={handleGrantControl}
                        onRevokeControl={handleRevokeControl}
                      />
                    );
                  })}
                </div>

                {/* Sidebar Call Control Panel */}
                <div className="mt-5 pt-3 border-t border-white/10 flex flex-col gap-2">
                  <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Video Call Controls</span>
                  {inCall ? (
                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5 gap-2">
                      <button
                        onClick={toggleMute}
                        className={`p-2 rounded-xl transition-all flex-1 flex justify-center ${
                          isMuted ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}
                        title={isMuted ? "Unmute Mic" : "Mute Mic"}
                      >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={toggleCamera}
                        className={`p-2 rounded-xl transition-all flex-1 flex justify-center ${
                          isCameraOff ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}
                        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                      >
                        {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={toggleHand}
                        className={`p-2 rounded-xl transition-all flex-1 flex justify-center text-sm ${
                          isHandRaised ? 'bg-gold/30 text-gold border border-gold/40' : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        }`}
                        title={isHandRaised ? "Lower Hand" : "Raise Hand"}
                      >
                        ✋
                      </button>
                      <button
                        onClick={leaveVideoCall}
                        className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all flex-1 flex justify-center"
                        title="Leave Video Call"
                      >
                        <PhoneOff className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={joinVideoCall}
                      className="w-full py-2 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 transition-all flex items-center justify-center gap-2 text-xs font-semibold"
                    >
                      <Phone className="w-4 h-4" /> Join Video Call
                    </button>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#101625] p-6">
            <h3 className="text-xl font-bold">Leave Watch Room?</h3>
            <p className="mt-2 text-sm text-white/70">Are you sure you want to leave this room?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={cancelLeave} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10">Stay</button>
              <button onClick={confirmLeave} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600">Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchRoom;