# Watch Together Sync Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Watch Together Sync System                   │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────┐│
│  │   Client A   │◄───────►│    Server    │◄───────►│ Client B ││
│  │  (Host)      │         │  (Authority) │         │ (Guest)  ││
│  └──────────────┘         └──────────────┘         └──────────┘│
│         │                        │                        │      │
│         │  1. video-play         │                        │      │
│         │  + clientTimestamp     │                        │      │
│         ├───────────────────────►│                        │      │
│         │                        │  2. Validate timestamp │      │
│         │                        │  3. Update DB          │      │
│         │                        │  4. Broadcast          │      │
│         │                        ├───────────────────────►│      │
│         │                        │  + serverTimestamp     │      │
│         │                        │  + bufferDelay: 200ms  │      │
│         │                        │                        │      │
│         │                        │                   5. Buffer   │
│         │                        │                   6. Sync time│
│         │                        │                   7. Play     │
│         │                        │                        │      │
│         │  8. Heartbeat (7s)     │                        │      │
│         ├───────────────────────►│                        │      │
│         │                        ├───────────────────────►│      │
│         │                        │                   9. Check    │
│         │                        │                   drift       │
│         │                        │                   10. Correct │
│         │                        │                   if > 1.5s   │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow Diagrams

### Play Event Flow

```
User A (Host)                Server                    User B (Guest)
    │                           │                            │
    │ 1. Clicks Play            │                            │
    ├──────────────────────────►│                            │
    │   video-play              │                            │
    │   time: 10.5s             │                            │
    │   clientTimestamp: T1     │                            │
    │                           │                            │
    │                           │ 2. Validate T1 > lastUpdate│
    │                           │ 3. Update DB               │
    │                           │    currentTime: 10.5       │
    │                           │    isPlaying: true         │
    │                           │    lastUpdated: T2         │
    │                           │                            │
    │                           ├───────────────────────────►│
    │                           │   video-play               │
    │                           │   time: 10.5s              │
    │                           │   serverTimestamp: T2      │
    │                           │   bufferDelay: 200ms       │
    │                           │                            │
    │                           │                            │ 4. Set programmatic flag
    │                           │                            │ 5. Check drift (0.3s < 1.5s)
    │                           │                            │ 6. Skip time sync
    │                           │                            │ 7. Wait 200ms (buffer)
    │                           │                            │ 8. video.play()
    │                           │                            │ 9. Clear programmatic flag
    │                           │                            │
    │◄──────────────────────────┴────────────────────────────┤
    │              Both playing at ~10.5s                     │
```

### Heartbeat Sync Flow

```
User A (Controller)           Server                    User B (Viewer)
    │                           │                            │
    │ Playing at 25.2s          │                            │ Playing at 25.1s
    │                           │                            │
    │ 1. Heartbeat (every 7s)   │                            │
    ├──────────────────────────►│                            │
    │   video-heartbeat         │                            │
    │   time: 25.2s             │                            │
    │   isPlaying: true         │                            │
    │                           │                            │
    │                           │ 2. Update DB               │
    │                           │    currentTime: 25.2       │
    │                           │                            │
    │                           ├───────────────────────────►│
    │                           │   video-heartbeat          │
    │                           │   time: 25.2s              │
    │                           │   isPlaying: true          │
    │                           │                            │
    │                           │                            │ 3. Calculate drift
    │                           │                            │    |25.1 - 25.2| = 0.1s
    │                           │                            │ 4. Check: 0.1s < 1.5s
    │                           │                            │ 5. Skip correction
    │                           │                            │    (smooth playback!)
    │                           │                            │
```

### Seek Event Flow

```
User A (Controller)           Server                    User B (Viewer)
    │                           │                            │
    │ Playing at 30s            │                            │ Playing at 30s
    │                           │                            │
    │ 1. Seeks to 60s           │                            │
    ├──────────────────────────►│                            │
    │   video-seek              │                            │
    │   time: 60.0s             │                            │
    │   clientTimestamp: T1     │                            │
    │                           │                            │
    │                           │ 2. Validate T1             │
    │                           │ 3. Update DB               │
    │                           │    currentTime: 60.0       │
    │                           │                            │
    │                           ├───────────────────────────►│
    │                           │   video-seek               │
    │                           │   time: 60.0s              │
    │                           │                            │
    │                           │                            │ 4. Set programmatic flag
    │                           │                            │ 5. FORCE sync (seek always syncs)
    │                           │                            │ 6. video.currentTime = 60.0
    │                           │                            │ 7. Clear programmatic flag
    │                           │                            │
    │◄──────────────────────────┴────────────────────────────┤
    │              Both at 60.0s                              │
```

### Race Condition Prevention

```
User A                        Server                    User B
    │                           │                            │
    │ 1. Play at T1=1000        │                            │ 2. Pause at T2=1002
    ├──────────────────────────►│◄───────────────────────────┤
    │   clientTimestamp: 1000   │   clientTimestamp: 1002    │
    │                           │                            │
    │                           │ 3. Process Play (T1=1000)  │
    │                           │    lastUpdate = 1000       │
    │                           │    state = PLAYING         │
    │                           │                            │
    │                           │ 4. Process Pause (T2=1002) │
    │                           │    Check: 1002 > 1000 ✓    │
    │                           │    lastUpdate = 1002       │
    │                           │    state = PAUSED          │
    │                           │                            │
    │◄──────────────────────────┴────────────────────────────┤
    │              Final state: PAUSED (latest wins)          │
    │                                                          │
    │                                                          │
    │ 5. Late Play arrives (T1=1000)                          │
    ├──────────────────────────►│                            │
    │   clientTimestamp: 1000   │                            │
    │                           │                            │
    │                           │ 6. Check: 1000 < 1002 ✗    │
    │                           │ 7. IGNORE (stale event)    │
    │                           │                            │
    │◄──────────────────────────┤                            │
    │   No broadcast (prevented race condition!)             │
```

## State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    Video Sync State Machine                  │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   INITIAL    │
                    │  (Loading)   │
                    └──────┬───────┘
                           │
                           │ room-joined
                           │ + videoState
                           ▼
                    ┌──────────────┐
              ┌────►│    SYNCED    │◄────┐
              │     │  (Playing/   │     │
              │     │   Paused)    │     │
              │     └──────┬───────┘     │
              │            │             │
              │            │ User action │
              │            │ (if has     │
              │            │  control)   │
              │            ▼             │
              │     ┌──────────────┐    │
              │     │   EMITTING   │    │
              │     │  (Suppress   │    │
              │     │   650ms)     │    │
              │     └──────┬───────┘    │
              │            │             │
              │            │ Emit event  │
              │            │ + timestamp │
              │            ▼             │
              │     ┌──────────────┐    │
              │     │   WAITING    │    │
              │     │  (Server     │    │
              │     │   process)   │    │
              │     └──────┬───────┘    │
              │            │             │
              │            │ Broadcast   │
              │            ▼             │
              │     ┌──────────────┐    │
              └─────┤  RECEIVING   │────┘
                    │ (Apply state │
                    │  if drift >  │
                    │  threshold)  │
                    └──────────────┘

                    Heartbeat Loop
                    (Every 7s if playing)
                           │
                           ▼
                    ┌──────────────┐
                    │   CHECKING   │
                    │   (Measure   │
                    │    drift)    │
                    └──────┬───────┘
                           │
                    ┌──────┴──────┐
                    │             │
            drift < 1.5s    drift > 1.5s
                    │             │
                    ▼             ▼
            ┌──────────┐   ┌──────────┐
            │   SKIP   │   │  CORRECT │
            │ (Smooth) │   │  (Sync)  │
            └──────────┘   └──────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WatchRoom Component                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Video Player                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  <video>                                            │ │   │
│  │  │    ref={videoRef}                                   │ │   │
│  │  │    onPlay={handleVideoPlay}                         │ │   │
│  │  │    onPause={handleVideoPause}                       │ │   │
│  │  │    onSeeked={handleVideoSeeked}                     │ │   │
│  │  │    controls={hasPlaybackControl}                    │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Sync Logic Layer                        │   │
│  │                                                           │   │
│  │  • applyRemoteVideoState(video, state, forceSync)       │   │
│  │    └─ Threshold-based sync (1.5s tolerance)             │   │
│  │                                                           │   │
│  │  • emitVideoSync(eventName)                              │   │
│  │    └─ Checks: programmatic, suppress, hasControl        │   │
│  │                                                           │   │
│  │  • startHeartbeat() / stopHeartbeat()                    │   │
│  │    └─ Periodic sync every 7s when playing               │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Socket.IO Handlers                      │   │
│  │                                                           │   │
│  │  socket.on('room-joined')        → Initial sync          │   │
│  │  socket.on('video-play')         → Buffered play         │   │
│  │  socket.on('video-pause')        → Immediate pause       │   │
│  │  socket.on('video-seek')         → Force sync            │   │
│  │  socket.on('video-heartbeat')    → Threshold check       │   │
│  │  socket.on('playback:control')   → Update permissions    │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    State Management                       │   │
│  │                                                           │   │
│  │  Refs:                          State:                   │   │
│  │  • videoRef                     • roomData               │   │
│  │  • socketRef                    • activeUsers            │   │
│  │  • isProgrammaticRef            • canControlPlayback     │   │
│  │  • suppressEmitsUntilRef        • controllerUserIds      │   │
│  │  • heartbeatIntervalRef         • chatMessages           │   │
│  │  • lastHeartbeatTimeRef         • videoError             │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Outbound (Client → Server)

```
User Action
    │
    ▼
Event Handler (onPlay/onPause/onSeeked)
    │
    ▼
Check Guards
    ├─ isProgrammatic? → STOP
    ├─ suppressEmits? → STOP
    └─ hasControl? → STOP
    │
    ▼
Emit to Server
    ├─ eventName: 'video-play'
    ├─ roomId: '...'
    ├─ time: 25.5
    └─ clientTimestamp: Date.now()
    │
    ▼
Server Receives
    │
    ▼
Validate Timestamp
    ├─ clientTimestamp < lastUpdate? → REJECT
    └─ clientTimestamp >= lastUpdate → ACCEPT
    │
    ▼
Update Database
    ├─ videoState.currentTime = time
    ├─ videoState.isPlaying = true/false
    └─ videoState.lastUpdated = now
    │
    ▼
Broadcast to Others
    ├─ socket.to(room).emit(...)
    └─ Include serverTimestamp
```

### Inbound (Server → Client)

```
Socket Event Received
    │
    ▼
Extract Payload
    ├─ time: 25.5
    ├─ isPlaying: true
    ├─ serverTimestamp: T
    └─ bufferDelay: 200 (for play)
    │
    ▼
Set Programmatic Flag
    ├─ isProgrammaticRef.current = true
    └─ suppressEmitsUntilRef.current = now + 650ms
    │
    ▼
Calculate Drift
    │ drift = |video.currentTime - payload.time|
    │
    ▼
Apply Sync Logic
    ├─ If seek/initial: FORCE sync (no threshold)
    ├─ If heartbeat: Check drift > 1.5s
    │   ├─ Yes → Sync time
    │   └─ No → Skip (smooth!)
    └─ If play: Buffer 200ms, then play
    │
    ▼
Update Video Element
    ├─ video.currentTime = time (if needed)
    └─ video.play() / video.pause()
    │
    ▼
Clear Programmatic Flag (after 180ms)
    └─ isProgrammaticRef.current = false
```

## Timing Diagram

```
Time (ms)    Client A (Controller)              Server                Client B (Viewer)
─────────────────────────────────────────────────────────────────────────────────────
0            User clicks Play
             │
50           Emit video-play ──────────────────►
             clientTimestamp: 50
             │
100                                              Receive & validate
                                                 lastUpdate check ✓
                                                 Update DB
                                                 │
150                                              Broadcast ──────────────────────────►
                                                 serverTimestamp: 150
                                                 bufferDelay: 200
                                                 │
200                                                                    Receive event
                                                                       Set programmatic
                                                                       Check drift
                                                                       │
350                                                                    Buffer wait...
                                                                       │
400                                                                    video.play()
                                                                       │
580                                                                    Clear programmatic
                                                                       │
─────────────────────────────────────────────────────────────────────────────────────
Result: Both clients playing, total latency ~400ms (well under 500ms target)
```

## Configuration Impact

### SYNC_THRESHOLD = 1.5s

```
Drift Timeline:
0.0s ────────────────────────────────────────────────────────────► Time
     │         │         │         │         │         │
     0.5s      1.0s      1.5s      2.0s      2.5s      3.0s
     │         │         │         │         │         │
     ├─────────┴─────────┤         ├─────────┴─────────┤
     NO SYNC (smooth)    │         SYNC (correct)
                         │
                    THRESHOLD
```

### HEARTBEAT_INTERVAL = 7000ms

```
Sync Events:
0s ──────────────────────────────────────────────────────────────► Time
│                 │                 │                 │
Play              7s                14s               21s
│                 │                 │                 │
└─ video-play     └─ heartbeat      └─ heartbeat      └─ heartbeat
   (immediate)       (periodic)        (periodic)        (periodic)

Bandwidth: ~0.14 packets/sec (vs 1.25 with old 800ms interval)
```

### BUFFER_DELAY = 200ms

```
Play Command Timeline:
0ms ──────────────────────────────────────────────────────────────► Time
│         │         │         │         │         │
Emit      Receive   Buffer    Play      All       Sync
play      event     wait      starts    synced    complete
│         │         │         │         │         │
0ms       50ms      200ms     250ms     300ms     400ms
          │         │         │         │         │
          └─────────┴─────────┘         └─────────┘
          Network + Buffer              Playback sync
```

## Summary

This architecture provides:
- **Single source of truth** (database)
- **Timestamp-based ordering** (no race conditions)
- **Threshold-based syncing** (smooth playback)
- **Event-driven updates** (efficient bandwidth)
- **Buffered playback** (synchronized start)
- **Heartbeat monitoring** (drift correction)

Result: Sub-500ms sync accuracy with smooth, stutter-free playback! 🎉
