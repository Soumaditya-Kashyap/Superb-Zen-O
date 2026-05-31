import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:5000';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const CLOUDFRONT_BASE_URL =
  import.meta.env
    .VITE_CLOUDFRONT_BASE_URL ||
  'https://d2k6afcpy0ja0m.cloudfront.net';

const SAMPLE_VIDEO_URL =
  import.meta.env
    .VITE_WATCHROOM_SAMPLE_VIDEO_URL ||
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const SYNC_THRESHOLD = 1.5;
const HEARTBEAT_INTERVAL = 7000;
const BUFFER_DELAY = 200;
const SUPPRESS_EMIT_DURATION = 650;
const PROGRAMMATIC_FLAG_DURATION = 180;

const WatchRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [roomData, setRoomData] =
    useState(null);

  const [resolvedRoomId, setResolvedRoomId] =
    useState(roomId);

  const [activeUsers, setActiveUsers] =
    useState([]);

  const [chatMessages, setChatMessages] =
    useState([]);

  const [floatingMessages, setFloatingMessages] =
    useState([]);

  const [chatInput, setChatInput] =
    useState('');

  const [chatSending, setChatSending] =
    useState(false);

  const [loadingRoom, setLoadingRoom] =
    useState(true);

  const [roomError, setRoomError] =
    useState('');

  const [videoError, setVideoError] =
    useState('');

  const [canControlPlayback, setCanControlPlayback] =
    useState(false);

  const [controllerUserIds, setControllerUserIds] =
    useState([]);

  const [
    showLeaveConfirmModal,
    setShowLeaveConfirmModal,
  ] = useState(false);

  const [
    pendingNavigationPath,
    setPendingNavigationPath,
  ] = useState('');

  const [leavingRoom, setLeavingRoom] =
    useState(false);

  const [
    showParticipantsSidebar,
    setShowParticipantsSidebar,
  ] = useState(true);

  const socketRef = useRef(null);

  const videoRef = useRef(null);

  const hlsRef = useRef(null);

  const isProgrammaticRef =
    useRef(false);

  const suppressEmitsUntilRef =
    useRef(0);

  const heartbeatIntervalRef =
    useRef(null);

  const intentionalLeaveRef =
    useRef(false);

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
              'http://localhost:5000/api/auth/me',
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

  const normalizeId = (value) => {
    if (!value) return '';

    if (typeof value === 'string')
      return value;

    if (typeof value === 'object') {
      if (value.$oid) return value.$oid;

      if (value._id)
        return normalizeId(value._id);
    }

    return String(value);
  };

  const hostUserId = normalizeId(
    roomData?.host?._id ||
    roomData?.host
  );

  const isRoomHost =
    normalizeId(currentUserId) ===
    hostUserId;

  const hasPlaybackControl =
    canControlPlayback || isRoomHost;

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

    heartbeatIntervalRef.current =
      setInterval(() => {
        const socket =
          socketRef.current;

        const video = videoRef.current;

        if (
          !socket ||
          !video ||
          !hasPlaybackControl
        )
          return;

        if (
          isProgrammaticRef.current
        )
          return;

        if (
          Date.now() <
          suppressEmitsUntilRef.current
        )
          return;

        if (!video.paused) {
          socket.emit(
            'video-heartbeat',
            {
              roomId:
                resolvedRoomId ||
                roomId,
              time:
                video.currentTime ||
                0,
              isPlaying:
                !video.paused,
            }
          );
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
          `${API_BASE_URL}/rooms/${roomId}`,
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

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const folder =
      roomData?.movie
        ?.videoFolderName;

    const hlsUrl = folder
      ? `${CLOUDFRONT_BASE_URL}/${folder}/master.m3u8`
      : null;

    if (hlsRef.current) {
      hlsRef.current.destroy();

      hlsRef.current = null;
    }

    if (!hlsUrl) {
      video.src =
        SAMPLE_VIDEO_URL;

      return;
    }

    if (
      video.canPlayType(
        'application/vnd.apple.mpegurl'
      )
    ) {
      video.src = hlsUrl;

      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);

      hls.attachMedia(video);

      hls.on(
        Hls.Events.ERROR,
        (_event, data) => {
          if (data?.fatal) {
            setVideoError(
              'Failed to load stream'
            );

            video.src =
              SAMPLE_VIDEO_URL;
          }
        }
      );
    }
  }, [
    roomData?.movie
      ?.videoFolderName,
  ]);

  useEffect(() => {
    const token =
      localStorage.getItem('token');

    if (!token || !roomId)
      return undefined;

    const socket = io(
      SOCKET_URL,
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

    socket.on('connect', () => {
      socket.emit(
        'join-room',
        {
          roomId,

          user: {
            id:
              currentUser?.id ||
              currentUser?._id,

            name:
              currentUser?.name,

            nickName:
              currentUser?.nickName,

            profilePicture:
              currentUser?.profilePicture,
          },
        }
      );

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

        if (
          payload?.videoState
        ) {
          const video =
            videoRef.current;

          if (video) {
            applyRemoteVideoState(
              video,
              payload.videoState,
              true
            );
          }
        }
      }
    );

    socket.on(
      'watch:message:received',
      (payload) => {
        const incomingMessage =
          payload?.message;

        if (
          !incomingMessage?._id
        )
          return;

        setChatMessages(
          (prev) => {
            const exists =
              prev.some(
                (m) =>
                  normalizeId(
                    m._id
                  ) ===
                  normalizeId(
                    incomingMessage._id
                  )
              );

            if (exists)
              return prev;

            return [
              ...prev,
              incomingMessage,
            ];
          }
        );

        const floatingId =
          crypto.randomUUID();

        setFloatingMessages(
          (prev) => [
            ...prev,
            {
              id: floatingId,
              sender:
                incomingMessage
                  .sender
                  ?.nickName ||
                incomingMessage
                  .sender
                  ?.name ||
                'User',
              content:
                incomingMessage.content,
            },
          ]
        );

        setTimeout(() => {
          setFloatingMessages(
            (prev) =>
              prev.filter(
                (m) =>
                  m.id !==
                  floatingId
              )
          );
        }, 6000);
      }
    );

    socket.on(
      'video-play',
      async (payload) => {
        const video =
          videoRef.current;

        if (!video) return;

        const targetTime =
          Number(
            payload?.time
          );

        isProgrammaticRef.current =
          true;

        suppressEmitsUntilRef.current =
          Date.now() +
          SUPPRESS_EMIT_DURATION;

        if (
          Number.isFinite(
            targetTime
          ) &&
          Math.abs(
            video.currentTime -
            targetTime
          ) > 0.6
        ) {
          video.currentTime =
            targetTime;
        }

        setTimeout(
          async () => {
            try {
              await video.play();
            } catch { }

            setTimeout(() => {
              isProgrammaticRef.current =
                false;
            }, PROGRAMMATIC_FLAG_DURATION);
          },
          BUFFER_DELAY
        );
      }
    );

    socket.on(
      'video-pause',
      (payload) => {
        const video =
          videoRef.current;

        if (!video) return;

        isProgrammaticRef.current =
          true;

        video.currentTime =
          payload?.time;

        video.pause();

        setTimeout(() => {
          isProgrammaticRef.current =
            false;
        }, PROGRAMMATIC_FLAG_DURATION);
      }
    );

    socket.on(
      'video-seek',
      (payload) => {
        const video =
          videoRef.current;

        if (!video) return;

        isProgrammaticRef.current =
          true;

        video.currentTime =
          payload?.time;

        setTimeout(() => {
          isProgrammaticRef.current =
            false;
        }, PROGRAMMATIC_FLAG_DURATION);
      }
    );

    return () => {
      stopHeartbeat();

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
  }, [hasPlaybackControl]);

  const emitVideoSync = (
    eventName
  ) => {
    const socket =
      socketRef.current;

    const video = videoRef.current;

    if (!socket || !video)
      return;

    if (
      isProgrammaticRef.current
    )
      return;

    if (
      Date.now() <
      suppressEmitsUntilRef.current
    )
      return;

    if (!hasPlaybackControl)
      return;

    socket.emit(eventName, {
      roomId:
        resolvedRoomId ||
        roomId,
      time:
        video.currentTime || 0,
    });
  };

  const handleVideoPlay = () =>
    emitVideoSync('video-play');

  const handleVideoPause = () =>
    emitVideoSync(
      'video-pause'
    );

  const handleVideoSeeked = () =>
    emitVideoSync(
      'video-seek'
    );

  const handleSendMessage =
    async () => {
      const content =
        chatInput.trim();

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

      setChatInput('');
    };

  const handleChatKeyDown = (
    e
  ) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault();

      handleSendMessage();
    }
  };

  const isCurrentUser = (
    user
  ) => {
    const userId =
      user?.id ||
      user?._id;

    return (
      normalizeId(userId) ===
      normalizeId(currentUserId)
    );
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
  {/* =====================================================
      MAIN CONTAINER
  ===================================================== */}
  <div className="h-[calc(100vh-24px)] flex flex-col gap-3">
    
    {/* =====================================================
        TOP AREA: VIDEO + PARTICIPANTS
    ===================================================== */}
    <div className="flex-1 flex gap-3 min-h-0">
      
      {/* =====================================================
          VIDEO + CHAT SECTION
      ===================================================== */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        
        {/* =====================================================
            VIDEO SECTION
        ===================================================== */}
        <section className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-black min-h-0">
          
          {/* VIDEO */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-black"
            controls={hasPlaybackControl}
            playsInline
            preload="metadata"
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onSeeked={handleVideoSeeked}
            poster={
              roomData?.movie?.Poster && roomData.movie.Poster !== 'N/A'
                ? roomData.movie.Poster
                : undefined
            }
          >
            <source src={SAMPLE_VIDEO_URL} type="video/mp4" />
          </video>

          {/* =====================================================
              TOP OVERLAY
          ===================================================== */}
          <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-5 bg-gradient-to-b from-black/90 to-transparent">
            {/* LEFT */}
            <div>
              <h1 className="text-2xl font-bold">Watch Room</h1>
              <p className="text-sm text-white/60 mt-1">
                Watch Party{" "}
                <span className="text-gold font-semibold">
                  {roomData?.roomCode || roomData?.code || roomId}
                </span>
              </p>
            </div>

            {/* LEAVE BUTTON */}
            <button
              onClick={() => openLeaveConfirmation('/watch-together')}
              className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
            >
              Leave
            </button>
          </div>

          {/* =====================================================
              FLOATING CHAT
          ===================================================== */}
          <div className="absolute left-5 bottom-5 z-40 flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
              {floatingMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 100, scale: 0.8 }}
                  animate={{ opacity: 1, y: -180, scale: 1 }}
                  exit={{ opacity: 0, y: -260 }}
                  transition={{ duration: 6, ease: 'easeOut' }}
                  className="max-w-sm rounded-2xl border border-white/10 bg-black/30 backdrop-blur-2xl px-4 py-3 shadow-2xl"
                >
                  <p className="text-gold text-xs font-bold mb-1">
                    {msg.sender}
                  </p>
                  <p className="text-white text-sm break-words">
                    {msg.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* =====================================================
            COMPACT CHAT BOX
        ===================================================== */}
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-2xl px-3 py-2">
          <div className="flex items-center gap-2">
            {/* INPUT */}
            <input
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/40"
            />

            {/* SEND BUTTON */}
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || chatSending}
              className="px-4 py-1.5 rounded-xl bg-gold text-black text-sm font-semibold hover:bg-gold-light transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          PARTICIPANTS SIDEBAR
      ===================================================== */}
      <AnimatePresence>
        {showParticipantsSidebar && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ duration: 0.3 }}
            className="w-[290px] rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl p-4 overflow-y-auto shrink-0"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Participants</h2>
              <span className="text-xs text-white/50">
                {activeUsers.length} online
              </span>
            </div>

            {/* PARTICIPANTS */}
            <div className="flex flex-col gap-4">
              {activeUsers.map((participant, index) => (
                <div
                  key={participant.id || participant._id || index}
                  className="rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-4 min-h-[220px]"
                >
                  {/* AVATAR */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1a1f2e] flex items-center justify-center mb-3 border border-white/10 shrink-0">
                    {isCurrentUser(participant) && currentUser?.profilePicture ? (
                      <img
                        src={currentUser.profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : participant?.profilePicture ? (
                      <img
                        src={participant.profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gold to-yellow-500" />
                    )}
                  </div>

                  {/* NAME */}
                  <p className="text-sm text-white text-center font-medium line-clamp-2">
                    {participant.nickName || participant.name}
                    {isCurrentUser(participant) ? ' (You)' : ''}
                  </p>

                  {/* STATUS */}
                  <p className="text-xs text-green-400 mt-1">Online</p>

                  {/* CONTROL */}
                  {canUserControlPlayback(participant) && (
                    <p className="text-[11px] text-gold mt-2 text-center">
                      Playback Control
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  </div>

  {/* =====================================================
      LEAVE MODAL
  ===================================================== */}
  {showLeaveConfirmModal && (
    <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#101625] p-6">
        {/* TITLE */}
        <h3 className="text-xl font-bold">Leave Watch Room?</h3>
        
        {/* DESCRIPTION */}
        <p className="mt-2 text-sm text-white/70">
          Are you sure you want to leave this room?
        </p>

        {/* ACTIONS */}
        <div className="mt-6 flex justify-end gap-3">
          {/* CANCEL */}
          <button
            onClick={cancelLeave}
            className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10"
          >
            Stay
          </button>

          {/* CONFIRM */}
          <button
            onClick={confirmLeave}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
};

export default WatchRoom;