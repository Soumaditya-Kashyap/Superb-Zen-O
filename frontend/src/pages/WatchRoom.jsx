import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Hls from 'hls.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CLOUDFRONT_BASE_URL =
  import.meta.env.VITE_CLOUDFRONT_BASE_URL || 'https://d2k6afcpy0ja0m.cloudfront.net';
const SAMPLE_VIDEO_URL =
  import.meta.env.VITE_WATCHROOM_SAMPLE_VIDEO_URL ||
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const WatchRoom = () => {
  const { roomId } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [resolvedRoomId, setResolvedRoomId] = useState(roomId);
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [canControlPlayback, setCanControlPlayback] = useState(false);
  const [controllerUserIds, setControllerUserIds] = useState([]);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const isProgrammaticRef = useRef(false);
  const lastSyncEmitRef = useRef(0);
  const suppressEmitsUntilRef = useRef(0);
  const pendingVideoStateRef = useRef(null);
  const initialSyncAppliedRef = useRef(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const currentUserId = currentUser.id || currentUser._id;

  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value.$oid) return value.$oid;
      if (value._id) return normalizeId(value._id);
      if (typeof value.toString === 'function') {
        const asText = value.toString();
        if (asText && asText !== '[object Object]') return asText;
      }
    }
    return String(value);
  };

  const hostUserId = normalizeId(roomData?.host?._id || roomData?.host);
  const isRoomHost =
    !!normalizeId(currentUserId) && normalizeId(currentUserId) === hostUserId;
  const hasPlaybackControl = canControlPlayback || isRoomHost;

  const applyRemoteVideoState = async (video, state) => {
    if (!video || !state) return;

    isProgrammaticRef.current = true;
    suppressEmitsUntilRef.current = Date.now() + 650;

    const targetTime = Number(state.currentTime || 0);
    if (Number.isFinite(targetTime) && Math.abs(video.currentTime - targetTime) > 0.45) {
      video.currentTime = targetTime;
    }

    if (state.isPlaying) {
      try {
        await video.play();
      } catch {
        try {
          video.muted = true;
          await video.play();
        } catch {
          // ignore if browser blocks autoplay
        }
      }
    } else {
      video.pause();
    }

    setTimeout(() => {
      isProgrammaticRef.current = false;
    }, 180);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    const fetchRoom = async () => {
      try {
        setLoadingRoom(true);
        setRoomError('');

        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load room');
        }

        setRoomData(data.room);
        setResolvedRoomId(normalizeId(data.room?._id || roomId));

        const initialMessages = Array.isArray(data.room?.messages)
          ? data.room.messages.map((m) => ({
              _id: m._id,
              roomId: data.room?._id,
              sender: m.sender || null,
              content: m.content,
              createdAt: m.createdAt
            }))
          : [];

        setChatMessages(initialMessages);
      } catch (error) {
        setRoomError(error.message || 'Unable to load room');
      } finally {
        setLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const folder = roomData?.movie?.videoFolderName;
    const hlsUrl = folder ? `${CLOUDFRONT_BASE_URL}/${folder}/master.m3u8` : null;

    // Cleanup any previous HLS instance before setting a new source
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setVideoError('');

    if (!hlsUrl) {
      video.src = SAMPLE_VIDEO_URL;
      return undefined;
    }

    // Use native HLS on Safari, Hls.js on other modern browsers
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      return undefined;
    }

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current = socket;

    const myId = currentUser.id || currentUser._id;
    const myName = currentUser.nickName || currentUser.name || 'You';

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomId,
        user: {
          id: myId,
          name: myName
        }
      });
    });

    socket.on('room-joined', (payload) => {
      if (payload?.roomId) {
        setResolvedRoomId(normalizeId(payload.roomId));
      }

      if (payload?.permissions) {
        const controllers = Array.isArray(payload.permissions.controllers)
          ? payload.permissions.controllers.map((id) => normalizeId(id))
          : [];

        setControllerUserIds(controllers);
        setCanControlPlayback(
          !!payload.permissions.canControl || controllers.includes(normalizeId(currentUserId))
        );
      }

      if (payload?.videoState) {
        initialSyncAppliedRef.current = true;
        pendingVideoStateRef.current = payload.videoState;
        const video = videoRef.current;
        if (video) {
          if (video.readyState >= 1) {
            applyRemoteVideoState(video, payload.videoState);
            pendingVideoStateRef.current = null;
          } else {
            const onLoaded = () => {
              if (pendingVideoStateRef.current) {
                applyRemoteVideoState(video, pendingVideoStateRef.current);
                pendingVideoStateRef.current = null;
              }
            };
            video.addEventListener('loadedmetadata', onLoaded, { once: true });
          }
        }
      }
    });

    socket.on('user-connected', (payload) => {
      const incomingUser = payload?.user || payload;
      const incomingId = incomingUser?.id || incomingUser?._id;
      if (!incomingId) return;

      setActiveUsers((prev) => {
        const exists = prev.some((u) => (u.id || u._id) === incomingId);
        if (exists) return prev;
        return [...prev, incomingUser];
      });
    });

    socket.on('room-users', (payload) => {
      const users = Array.isArray(payload?.users) ? payload.users : [];
      setActiveUsers(users);
    });

    socket.on('playback:control-state', (payload) => {
      const controllers = Array.isArray(payload?.controllers)
        ? payload.controllers.map((id) => normalizeId(id))
        : [];

      setControllerUserIds(controllers);
      setCanControlPlayback(controllers.includes(normalizeId(currentUserId)));
    });

    socket.on('user-disconnected', (payload) => {
      const leavingId = payload?.userId || payload?.id || payload?._id;
      if (!leavingId) return;
      setActiveUsers((prev) => prev.filter((u) => (u.id || u._id) !== leavingId));
    });

    socket.on('watch:message:received', (payload) => {
      const incomingMessage = payload?.message;
      if (!incomingMessage?._id) return;

      setChatMessages((prev) => {
        const exists = prev.some((m) => normalizeId(m._id) === normalizeId(incomingMessage._id));
        if (exists) return prev;
        return [...prev, incomingMessage];
      });
    });

    const applyProgrammaticUpdate = (updater) => {
      const video = videoRef.current;
      if (!video) return;
      isProgrammaticRef.current = true;
      suppressEmitsUntilRef.current = Date.now() + 650;
      updater(video);
      setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 180);
    };

    socket.on('video-play', (payload) => {
      const video = videoRef.current;
      if (!video) return;
      const targetTime = Number(payload?.time);

      applyProgrammaticUpdate((v) => {
        if (Number.isFinite(targetTime) && Math.abs(v.currentTime - targetTime) > 0.6) {
          v.currentTime = targetTime;
        }
        v.play().catch(() => {});
      });
    });

    socket.on('video-pause', (payload) => {
      const video = videoRef.current;
      if (!video) return;
      const targetTime = Number(payload?.time);

      applyProgrammaticUpdate((v) => {
        if (Number.isFinite(targetTime) && Math.abs(v.currentTime - targetTime) > 0.6) {
          v.currentTime = targetTime;
        }
        v.pause();
      });
    });

    socket.on('video-seek', (payload) => {
      const video = videoRef.current;
      if (!video) return;
      const targetTime = Number(payload?.time);
      if (!Number.isFinite(targetTime)) return;

      applyProgrammaticUpdate((v) => {
        v.currentTime = targetTime;
      });
    });

    socket.on('video-sync', (payload) => {
      const video = videoRef.current;
      if (!video) return;

      const targetTime = Number(payload?.time);
      const shouldPlay = !!payload?.isPlaying;

      applyProgrammaticUpdate((v) => {
        if (Number.isFinite(targetTime) && Math.abs(v.currentTime - targetTime) > 1.0) {
          v.currentTime = targetTime;
        }

        if (shouldPlay && v.paused) {
          v.play().catch(() => {});
        } else if (!shouldPlay && !v.paused) {
          v.pause();
        }
      });
    });

    socket.on('error', (payload) => {
      const message = payload?.message || payload;
      if (message) {
        console.error('[WATCH ROOM] Socket error:', message);
      }
    });

    // Keep current user visible in participants list even before others join.
    setActiveUsers((prev) => {
      if (!myId) return prev;
      const exists = prev.some((u) => (u.id || u._id) === myId);
      if (exists) return prev;
      return [...prev, { id: myId, name: myName, nickName: currentUser.nickName }];
    });

    return () => {
      socket.emit('leave-room', {
        roomId,
        userId: myId
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, currentUser, currentUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    initialSyncAppliedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    const video = videoRef.current;
    const state = roomData?.videoState;
    if (!video || !state) return;
    if (initialSyncAppliedRef.current) return;

    const applyInitialState = async () => {
      initialSyncAppliedRef.current = true;
      await applyRemoteVideoState(video, {
        currentTime: state.currentTime || 0,
        isPlaying: !!state.isPlaying,
      });
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

  const getSenderName = (sender) => {
    if (!sender) return 'Unknown';
    if (typeof sender === 'string') return normalizeId(sender) === normalizeId(currentUserId) ? 'You' : 'User';
    return sender.nickName || sender.name || 'User';
  };

  const isOwnMessage = (sender) => {
    if (!sender) return false;
    const senderId = typeof sender === 'string' ? sender : sender._id;
    return normalizeId(senderId) === normalizeId(currentUserId);
  };

  const isCurrentUser = (user) => {
    const userId = user?.id || user?._id;
    return normalizeId(userId) === normalizeId(currentUserId);
  };

  const handleSendMessage = async () => {
    const content = chatInput.trim();
    if (!content || !socketRef.current) return;

    setChatSending(true);
    socketRef.current.emit(
      'watch:message:send',
      {
        roomId: resolvedRoomId || roomId,
        content
      },
      (ack) => {
        if (!ack?.success) {
          console.error('[WATCH ROOM] Failed to send message:', ack?.message || 'Unknown error');
        }
        setChatSending(false);
      }
    );
    setChatInput('');
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const emitVideoSync = (eventName) => {
    const socket = socketRef.current;
    const video = videoRef.current;
    if (!socket || !video) return;
    if (isProgrammaticRef.current) return;
    if (Date.now() < suppressEmitsUntilRef.current) return;
    if (!hasPlaybackControl) return;

    socket.emit(eventName, {
      roomId: resolvedRoomId || roomId,
      time: video.currentTime || 0
    });
  };

  const handleVideoPlay = () => emitVideoSync('video-play');
  const handleVideoPause = () => emitVideoSync('video-pause');
  const handleVideoSeeked = () => emitVideoSync('video-seek');
  const handleVideoTimeUpdate = () => {
    const socket = socketRef.current;
    const video = videoRef.current;
    if (!socket || !video || isProgrammaticRef.current) return;
    if (!hasPlaybackControl) return;
    if (Date.now() < suppressEmitsUntilRef.current) return;

    const now = Date.now();
    if (!video.paused && now - lastSyncEmitRef.current > 800) {
      lastSyncEmitRef.current = now;
      socket.emit('video-sync', {
        roomId: resolvedRoomId || roomId,
        time: video.currentTime || 0,
        isPlaying: !video.paused
      });
    }
  };

  const canUserControlPlayback = (user) => {
    const targetId = normalizeId(user?.id || user?._id);
    return controllerUserIds.includes(targetId);
  };

  const handleGrantControl = (targetUserId) => {
    if (!socketRef.current || !targetUserId) return;
    socketRef.current.emit('playback:grant-control', {
      roomId: resolvedRoomId || roomId,
      targetUserId: normalizeId(targetUserId)
    });
  };

  const handleRevokeControl = (targetUserId) => {
    if (!socketRef.current || !targetUserId) return;
    socketRef.current.emit('playback:revoke-control', {
      roomId: resolvedRoomId || roomId,
      targetUserId: normalizeId(targetUserId)
    });
  };

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/70">Loading room...</p>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Unable to open room</h1>
          <p className="text-white/70">{roomError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 lg:p-6">
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 md:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
        <section className="md:col-span-8 xl:col-span-9 bg-[#0b0f18] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col min-h-[300px] md:min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">Watch Room</h1>
            <span className="text-xs sm:text-sm text-white/60">Room: {roomData?.name || roomId}</span>
          </div>

          {videoError && (
            <div className="mb-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
              {videoError}
            </div>
          )}

          <div className="flex-1 rounded-xl border border-white/10 bg-gradient-to-br from-[#121a2a] to-[#090d16] p-3 sm:p-4 flex items-center justify-center">
            <div className="w-full h-full rounded-lg overflow-hidden border border-white/10 bg-black/60">
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                controls={hasPlaybackControl}
                playsInline
                preload="metadata"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onSeeked={handleVideoSeeked}
                onTimeUpdate={handleVideoTimeUpdate}
                poster={roomData?.movie?.Poster && roomData.movie.Poster !== 'N/A' ? roomData.movie.Poster : undefined}
              >
                <source src={SAMPLE_VIDEO_URL} type="video/mp4" />
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          </div>
          {!hasPlaybackControl && (
            <p className="mt-2 text-xs text-white/50 text-center">Playback controls are locked. Video sync stays automatic until access is granted.</p>
          )}
        </section>

        <aside className="md:col-span-4 xl:col-span-3 bg-[#0b0f18] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col min-h-0 h-[520px] md:h-full">
          <div className="flex-1 min-h-0 border border-white/10 rounded-xl p-3 sm:p-4 bg-[#0f1421]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Participants</h2>
              <span className="text-xs text-white/60">{activeUsers.length} online</span>
            </div>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-full pr-1">
              {activeUsers.map((user, index) => (
                <div key={user.id || user._id || index} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-gold to-gold-light text-black font-bold flex items-center justify-center">
                    {(user.nickName || user.name || 'U').charAt(0)}
                  </div>
                  <p className="text-xs text-white/85 truncate">
                    {user.nickName || user.name || 'Unknown'}{isCurrentUser(user) ? ' (You)' : ''}
                  </p>
                  {canUserControlPlayback(user) && (
                    <p className="mt-1 text-[10px] text-gold">Can control playback</p>
                  )}
                  {isRoomHost && !isCurrentUser(user) && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = user.id || user._id;
                        if (!targetId) return;
                        if (canUserControlPlayback(user)) {
                          handleRevokeControl(targetId);
                        } else {
                          handleGrantControl(targetId);
                        }
                      }}
                      className="mt-2 w-full rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-semibold text-gold hover:bg-gold/20 transition-colors"
                    >
                      {canUserControlPlayback(user) ? 'Revoke Control' : 'Grant Control'}
                    </button>
                  )}
                </div>
              ))}

              {activeUsers.length === 0 && (
                <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                  No participants online yet
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 border border-white/10 rounded-xl p-3 sm:p-4 bg-[#0f1421] mt-4 flex flex-col">
            <h2 className="font-semibold mb-3">Live Chat</h2>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {chatMessages.length > 0 ? (
                chatMessages.map((message) => {
                  const own = isOwnMessage(message.sender);
                  return (
                    <div key={message._id} className={`rounded-lg p-2.5 text-sm ${own ? 'bg-gold/15 border border-gold/20' : 'bg-white/5'}`}>
                      <p className="text-gold text-xs mb-1">{own ? 'You' : getSenderName(message.sender)}</p>
                      <p className="text-white/85 break-words">{message.content}</p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center text-sm text-white/60">
                  No messages yet. Say hello!
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-gold/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || chatSending}
                className="px-3 py-2 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chatSending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WatchRoom;
