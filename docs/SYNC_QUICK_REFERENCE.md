# Watch Together Sync - Quick Reference

## Core Principles

### 1. Don't Sync Every Second
❌ **Bad**: Sending current time every 800ms
```javascript
setInterval(() => {
  socket.emit('video-sync', { time: video.currentTime });
}, 800);
```

✅ **Good**: Heartbeat every 5-10 seconds + event-based sync
```javascript
// Only on state changes
video.onplay = () => socket.emit('video-play', { time });
video.onpause = () => socket.emit('video-pause', { time });
video.onseeked = () => socket.emit('video-seek', { time });

// Periodic drift check
setInterval(() => {
  if (!video.paused) {
    socket.emit('video-heartbeat', { time, isPlaying: true });
  }
}, 7000);
```

### 2. The Buffer Rule
❌ **Bad**: Immediate play on all clients
```javascript
socket.on('video-play', () => {
  video.play(); // Everyone plays at different times
});
```

✅ **Good**: Buffer first, then play simultaneously
```javascript
socket.on('video-play', ({ time, bufferDelay = 200 }) => {
  video.currentTime = time;
  setTimeout(() => video.play(), bufferDelay);
});
```

### 3. Thresholding
❌ **Bad**: Force sync on every tiny drift
```javascript
socket.on('video-heartbeat', ({ time }) => {
  video.currentTime = time; // Causes stuttering!
});
```

✅ **Good**: Only sync if drift > threshold
```javascript
socket.on('video-heartbeat', ({ time }) => {
  const drift = Math.abs(video.currentTime - time);
  if (drift > 1.5) { // Only if >1.5s off
    video.currentTime = time;
  }
});
```

### 4. Race Condition Prevention
❌ **Bad**: No timestamp validation
```javascript
socket.on('video-play', ({ time }) => {
  // Old events can override new ones
  video.currentTime = time;
  video.play();
});
```

✅ **Good**: Timestamp-based ordering
```javascript
// Client sends
socket.emit('video-play', {
  time: video.currentTime,
  clientTimestamp: Date.now()
});

// Server validates
const lastUpdate = roomLastUpdate.get(roomId) || 0;
if (clientTimestamp < lastUpdate) {
  return; // Ignore stale event
}
roomLastUpdate.set(roomId, Date.now());
```

### 5. Programmatic vs User Actions
❌ **Bad**: Feedback loops
```javascript
video.onplay = () => socket.emit('video-play');

socket.on('video-play', () => {
  video.play(); // Triggers onplay again!
});
```

✅ **Good**: Flag programmatic changes
```javascript
let isProgrammatic = false;

video.onplay = () => {
  if (!isProgrammatic) {
    socket.emit('video-play');
  }
};

socket.on('video-play', () => {
  isProgrammatic = true;
  video.play();
  setTimeout(() => isProgrammatic = false, 200);
});
```

## Configuration Values

### Recommended Settings
```javascript
const SYNC_THRESHOLD = 1.5;        // Drift tolerance (seconds)
const HEARTBEAT_INTERVAL = 7000;   // Heartbeat frequency (ms)
const BUFFER_DELAY = 200;          // Pre-play buffer (ms)
const SUPPRESS_DURATION = 650;     // Emit suppression (ms)
```

### Network-Specific Tuning

**Fast Network (< 50ms latency)**
```javascript
SYNC_THRESHOLD = 1.0;
HEARTBEAT_INTERVAL = 5000;
BUFFER_DELAY = 150;
```

**Slow Network (> 200ms latency)**
```javascript
SYNC_THRESHOLD = 2.5;
HEARTBEAT_INTERVAL = 10000;
BUFFER_DELAY = 300;
```

**Mobile/Unstable Network**
```javascript
SYNC_THRESHOLD = 3.0;
HEARTBEAT_INTERVAL = 12000;
BUFFER_DELAY = 400;
```

## Event Flow Diagram

```
User Action (Play)
    ↓
Check: isProgrammatic? → Yes → Ignore
    ↓ No
Check: suppressEmits? → Yes → Ignore
    ↓ No
Check: hasControl? → No → Ignore
    ↓ Yes
Emit 'video-play' + clientTimestamp
    ↓
Server receives
    ↓
Check: clientTimestamp < lastUpdate? → Yes → Ignore
    ↓ No
Update database + lastUpdate timestamp
    ↓
Broadcast to other clients + serverTimestamp
    ↓
Clients receive
    ↓
Set isProgrammatic = true
    ↓
Check drift > 0.6s? → Yes → Seek to time
    ↓
Buffer for 200ms
    ↓
video.play()
    ↓
Set isProgrammatic = false after 180ms
```

## Common Pitfalls

### 1. Forgetting to Suppress Emits
```javascript
// ❌ Creates feedback loop
socket.on('video-seek', ({ time }) => {
  video.currentTime = time; // Triggers onseeked event!
});

video.onseeked = () => {
  socket.emit('video-seek', { time }); // Loops forever
};

// ✅ Suppress during programmatic changes
socket.on('video-seek', ({ time }) => {
  suppressEmitsUntil = Date.now() + 650;
  video.currentTime = time;
});

video.onseeked = () => {
  if (Date.now() < suppressEmitsUntil) return;
  socket.emit('video-seek', { time });
};
```

### 2. Not Handling Async Play
```javascript
// ❌ Doesn't handle play() promise
socket.on('video-play', () => {
  video.play(); // Can throw error
});

// ✅ Handle promise and errors
socket.on('video-play', async () => {
  try {
    await video.play();
  } catch (err) {
    // Fallback: try muted autoplay
    video.muted = true;
    await video.play();
  }
});
```

### 3. Syncing Paused Videos
```javascript
// ❌ Sends heartbeat even when paused
setInterval(() => {
  socket.emit('video-heartbeat', {
    time: video.currentTime,
    isPlaying: !video.paused
  });
}, 7000);

// ✅ Only send when playing
setInterval(() => {
  if (!video.paused) { // Check first
    socket.emit('video-heartbeat', {
      time: video.currentTime,
      isPlaying: true
    });
  }
}, 7000);
```

## Debugging Tips

### Enable Sync Logging
```javascript
// Add to video event handlers
console.log(`[EMIT] video-play: time=${video.currentTime.toFixed(2)}s`);

// Add to socket handlers
console.log(`[RECV] video-play: time=${payload.time.toFixed(2)}s, drift=${drift.toFixed(2)}s`);

// Add to heartbeat
console.log(`[HEARTBEAT] Sent: time=${video.currentTime.toFixed(2)}s`);
console.log(`[HEARTBEAT] Corrected drift: ${drift.toFixed(2)}s`);
```

### Monitor Sync Accuracy
```javascript
let syncStats = {
  driftCorrections: 0,
  maxDrift: 0,
  avgDrift: 0
};

socket.on('video-heartbeat', ({ time }) => {
  const drift = Math.abs(video.currentTime - time);
  syncStats.maxDrift = Math.max(syncStats.maxDrift, drift);
  syncStats.avgDrift = (syncStats.avgDrift + drift) / 2;
  
  if (drift > SYNC_THRESHOLD) {
    syncStats.driftCorrections++;
  }
});

// Log every 30 seconds
setInterval(() => {
  console.log('[SYNC STATS]', syncStats);
}, 30000);
```

### Test Scenarios

**1. Basic Sync Test**
```javascript
// User A: Play at 10s
// User B: Should see play at 10s within 500ms
// Expected: No stuttering, smooth playback
```

**2. Rapid Action Test**
```javascript
// User A: Seek to 20s, 30s, 40s rapidly
// User B: Should follow without lag or rubber-banding
// Expected: Final position = 40s, no intermediate jumps
```

**3. Co-Control Test**
```javascript
// User A: Play at 50s
// User B: Pause at 55s (while A's play is in flight)
// Expected: Final state = paused at 55s (latest wins)
```

## Performance Checklist

- [ ] Heartbeat interval ≥ 5 seconds
- [ ] Sync threshold ≥ 1.0 seconds
- [ ] Buffer delay 150-300ms
- [ ] Programmatic flag prevents loops
- [ ] Suppress duration prevents rapid re-emits
- [ ] Timestamps prevent race conditions
- [ ] Only sync on state changes
- [ ] Threshold logic prevents micro-stuttering
- [ ] Async play() is handled properly
- [ ] Heartbeat only sends when playing

## Quick Fixes

**Problem: Stuttering every few seconds**
→ Increase `SYNC_THRESHOLD` to 2.0 or 2.5

**Problem: Users out of sync by 3-4 seconds**
→ Decrease `HEARTBEAT_INTERVAL` to 5000

**Problem: Play command feels delayed**
→ Decrease `BUFFER_DELAY` to 150

**Problem: Rapid seeks cause rubber-banding**
→ Increase `SUPPRESS_DURATION` to 800

**Problem: Pause/play toggle loops**
→ Check `isProgrammatic` flag is working

**Problem: Old events override new ones**
→ Verify `clientTimestamp` is being sent and validated
