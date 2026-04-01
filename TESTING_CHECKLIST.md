# Watch Together Sync - Testing Checklist

## Pre-Testing Setup

- [ ] Backend server is running (`npm start` in backend/)
- [ ] Frontend dev server is running (`npm run dev` in frontend/)
- [ ] MongoDB is connected and accessible
- [ ] Socket.IO connection is established (check browser console)
- [ ] At least 2 test user accounts are created

## Basic Functionality Tests

### 1. Room Creation & Joining
- [ ] Host can create a watch room
- [ ] Host receives invite code
- [ ] Guest can join using invite code
- [ ] Both users appear in participants list
- [ ] Video loads for both users

### 2. Initial Sync
- [ ] Guest joins mid-playback
- [ ] Guest's video syncs to correct timestamp
- [ ] Guest's play/pause state matches host
- [ ] Sync happens within 500ms of joining

### 3. Playback Control Permissions
- [ ] Only host has controls initially
- [ ] Guest sees "controls locked" message
- [ ] Host can grant control to guest
- [ ] Guest controls become enabled
- [ ] Host can revoke control from guest
- [ ] Guest controls become disabled again

## Synchronization Tests

### 4. Play/Pause Sync
- [ ] Host clicks play → Guest plays within 500ms
- [ ] Host clicks pause → Guest pauses within 500ms
- [ ] Guest (with control) clicks play → Host plays within 500ms
- [ ] Guest (with control) clicks pause → Host pauses within 500ms
- [ ] No stuttering or micro-jumps during sync
- [ ] Console shows `[SYNC]` logs with correct timestamps

### 5. Seek Sync
- [ ] Host seeks forward → Guest follows immediately
- [ ] Host seeks backward → Guest follows immediately
- [ ] Guest (with control) seeks → Host follows immediately
- [ ] No rubber-banding or multiple jumps
- [ ] Final position is accurate (within 0.5s)
- [ ] Console shows `[EMIT] video-seek` and `[SYNC] Seek received`

### 6. Heartbeat Sync
- [ ] Let video play for 30 seconds
- [ ] Console shows heartbeat every ~7 seconds
- [ ] Users stay in sync (drift < 1.5s)
- [ ] No visible stuttering or jumps
- [ ] Console shows `[HEARTBEAT] Sent` and drift corrections only when needed

### 7. Threshold Behavior
- [ ] Manually create 0.5s drift (pause one client briefly)
- [ ] Resume playback
- [ ] Verify NO sync correction (drift < 1.5s threshold)
- [ ] Manually create 2.5s drift
- [ ] Verify sync correction happens
- [ ] Console shows `[HEARTBEAT] Corrected drift: X.XXs`

## Edge Cases & Stress Tests

### 8. Rapid Actions
- [ ] Rapidly click play/pause 5 times
- [ ] Final state is correct (last action wins)
- [ ] No command queue buildup
- [ ] No feedback loops or infinite emits
- [ ] Console shows suppression working

### 9. Rapid Seeking
- [ ] Seek to 10s, 20s, 30s, 40s rapidly
- [ ] Final position is 40s (last seek wins)
- [ ] No intermediate jumps visible
- [ ] No rubber-banding
- [ ] Console shows stale events being ignored

### 10. Multiple Controllers
- [ ] Grant control to 2+ guests
- [ ] Each user performs actions
- [ ] No conflicts or state corruption
- [ ] Latest action always wins
- [ ] Console shows timestamp validation working

### 11. Network Latency Simulation
- [ ] Use browser DevTools to throttle network (Fast 3G)
- [ ] Perform play/pause/seek actions
- [ ] Verify threshold prevents stuttering
- [ ] Sync still works (may take longer)
- [ ] No errors in console

### 12. Late Join During Playback
- [ ] Start video playing at 60s
- [ ] New user joins room
- [ ] New user syncs to ~60s immediately
- [ ] New user's play state matches
- [ ] No initial stutter or jump

### 13. Disconnect & Reconnect
- [ ] Disconnect one user (close tab or kill network)
- [ ] Other users continue playing
- [ ] Reconnect disconnected user
- [ ] User re-syncs to current state
- [ ] No errors or crashes

### 14. Browser Autoplay Blocking
- [ ] Join room with autoplay blocked
- [ ] Verify fallback to muted autoplay
- [ ] Verify sync still works
- [ ] No console errors

## Performance Tests

### 15. Bandwidth Usage
- [ ] Open browser DevTools Network tab
- [ ] Play video for 60 seconds
- [ ] Count Socket.IO messages
- [ ] Verify ~8-10 heartbeats (not 60+)
- [ ] Verify only state changes emit events

### 16. CPU Usage
- [ ] Open browser Task Manager
- [ ] Play video for 60 seconds
- [ ] Verify CPU usage is reasonable (<10%)
- [ ] No memory leaks
- [ ] No excessive re-renders

### 17. Multiple Rooms
- [ ] Create 3 separate watch rooms
- [ ] Join different users to each
- [ ] Verify rooms don't interfere
- [ ] Each room syncs independently
- [ ] No cross-room events

## Console Log Verification

### 18. Expected Log Patterns

**On Play:**
```
[EMIT] video-play: time=10.50s
[SOCKET] video-play: room=..., time=10.50s, user=...
[SYNC] Play received: time=10.50s
```

**On Pause:**
```
[EMIT] video-pause: time=25.30s
[SOCKET] video-pause: room=..., time=25.30s, user=...
[SYNC] Pause received: time=25.30s
```

**On Seek:**
```
[EMIT] video-seek: time=60.00s
[SOCKET] video-seek: room=..., time=60.00s, user=...
[SYNC] Seek received: time=60.00s
```

**On Heartbeat:**
```
[HEARTBEAT] Sent: time=45.20s
[HEARTBEAT] Corrected drift: 2.10s  (only if drift > 1.5s)
```

**On Stale Event:**
```
[SOCKET] Ignoring stale video-play event
```

### 19. Error Patterns to Watch For

**Bad Signs (should NOT see):**
```
❌ [HEARTBEAT] Corrected drift: 0.30s  (too frequent, threshold too low)
❌ [SOCKET] Ignoring stale event  (every action, race condition)
❌ Uncaught Error: play() failed  (autoplay not handled)
❌ Maximum call stack exceeded  (feedback loop)
```

**Good Signs (should see):**
```
✅ [SYNC] Time corrected: 10.00s → 12.50s (drift: 2.50s)
✅ [HEARTBEAT] Sent: time=30.15s
✅ [SOCKET] video-play: room=..., time=10.50s, user=Alice
✅ [SYNC] Play received: time=10.50s
```

## User Experience Tests

### 20. Subjective Quality
- [ ] Playback feels smooth and natural
- [ ] Actions feel instant (<500ms perceived)
- [ ] No visible stuttering or micro-jumps
- [ ] Seeking is precise and immediate
- [ ] Multiple users can control without issues
- [ ] Overall experience feels "native"

### 21. Chat Functionality
- [ ] Chat messages send/receive correctly
- [ ] Chat doesn't interfere with video sync
- [ ] Messages appear in real-time
- [ ] No lag or delays

### 22. UI Responsiveness
- [ ] Grant/revoke control buttons work
- [ ] Participant list updates in real-time
- [ ] Video controls enable/disable correctly
- [ ] No UI freezing or lag

## Configuration Tuning Tests

### 23. Adjust SYNC_THRESHOLD
- [ ] Set to 1.0s → More frequent corrections
- [ ] Set to 2.5s → Less frequent corrections
- [ ] Find optimal value for your network
- [ ] Document chosen value

### 24. Adjust HEARTBEAT_INTERVAL
- [ ] Set to 5000ms → More frequent sync
- [ ] Set to 10000ms → Less frequent sync
- [ ] Verify drift stays acceptable
- [ ] Document chosen value

### 25. Adjust BUFFER_DELAY
- [ ] Set to 150ms → Faster play response
- [ ] Set to 300ms → More buffer time
- [ ] Test on slow devices
- [ ] Document chosen value

## Production Readiness

### 26. Error Handling
- [ ] Invalid room ID shows error
- [ ] Network errors are handled gracefully
- [ ] Socket disconnects are handled
- [ ] Video load errors show fallback

### 27. Security
- [ ] Only authorized users can join rooms
- [ ] Only users with control can emit events
- [ ] Server validates all timestamps
- [ ] No unauthorized state changes

### 28. Scalability
- [ ] Test with 5+ users in one room
- [ ] Test with 10+ concurrent rooms
- [ ] Monitor server CPU/memory
- [ ] Verify performance is acceptable

## Final Checklist

- [ ] All basic functionality tests pass
- [ ] All synchronization tests pass
- [ ] All edge cases handled correctly
- [ ] Performance is acceptable
- [ ] Console logs show expected patterns
- [ ] User experience is smooth
- [ ] Configuration is tuned
- [ ] Production ready

## Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: _______________

Basic Functionality: ☐ Pass ☐ Fail
Synchronization: ☐ Pass ☐ Fail
Edge Cases: ☐ Pass ☐ Fail
Performance: ☐ Pass ☐ Fail
User Experience: ☐ Pass ☐ Fail

Issues Found:
1. _______________
2. _______________
3. _______________

Configuration Used:
- SYNC_THRESHOLD: _______________
- HEARTBEAT_INTERVAL: _______________
- BUFFER_DELAY: _______________

Notes:
_______________________________________________
_______________________________________________
_______________________________________________

Overall Status: ☐ Ready for Production ☐ Needs Work
```

## Quick Test Script

For rapid testing, run this sequence:

1. **30-Second Smoke Test**
   - Create room
   - Join with second user
   - Play → Pause → Seek
   - Verify sync works

2. **2-Minute Stress Test**
   - Rapid play/pause (10x)
   - Rapid seeking (10x)
   - Grant/revoke control
   - Verify no errors

3. **5-Minute Endurance Test**
   - Let video play for 5 minutes
   - Monitor heartbeats
   - Check drift stays < 1.5s
   - Verify smooth playback

If all three pass, you're good to go! 🎉
