# Participant State Debug Guide

## Changes Made

### Backend (`backend/socket.js`)
1. **Reordered join logic**: User is now added to presence map BEFORE joining the socket room
2. **Added detailed logging**: Shows participant count and names when users join
3. **Ensured broadcast timing**: `room-users` event is sent after socket.join() completes

### Frontend (`frontend/src/pages/WatchRoom.jsx`)
1. **Added comprehensive logging** to track:
   - Socket connection
   - Room join events
   - User connected/disconnected events
   - Room users updates
2. **Better visibility** into what events are being received and when

## How to Test

### Step 1: Restart Backend
```bash
cd backend
npm start
```

### Step 2: Open Browser Console
Open Developer Tools (F12) in both browser windows/tabs

### Step 3: Test Scenario 1 - User 1 Joins First
1. User 1 opens watch room
2. Check console logs - you should see:
   ```
   [WATCH ROOM] Socket connected, joining room: <roomId>
   [WATCH ROOM] Room joined: {...}
   [WATCH ROOM] Room users update received: {...}
   [WATCH ROOM] Participants updated: 1 users - Jane
   ```
3. User 1 should see themselves in the participants list

### Step 4: Test Scenario 2 - User 2 Joins
1. User 2 opens the same watch room
2. Check User 2's console - should see:
   ```
   [WATCH ROOM] Socket connected, joining room: <roomId>
   [WATCH ROOM] Room joined: {...}
   [WATCH ROOM] Room users update received: {...}
   [WATCH ROOM] Participants updated: 2 users - Jane, Zimo
   ```
3. Check User 1's console - should see:
   ```
   [WATCH ROOM] User connected: {...}
   [WATCH ROOM] Room users update received: {...}
   [WATCH ROOM] Participants updated: 2 users - Jane, Zimo
   ```
4. **BOTH users should now see 2 participants WITHOUT REFRESH**

### Step 5: Check Backend Logs
Backend should show:
```
[SOCKET] Jane joined watch room <roomId>. Total users: 1
[SOCKET] Current participants: Jane
[SOCKET] Zimo joined watch room <roomId>. Total users: 2
[SOCKET] Current participants: Jane, Zimo
```

## What to Look For

### ✅ Success Indicators
- Participant count updates immediately for all users
- Console shows "room-users" event being received
- Backend logs show correct user count
- No refresh needed to see participants

### ❌ Problem Indicators
- "0 online" shown when users are connected
- "No participants online yet" when users are in room
- Console shows no "room-users" event
- Backend logs show user joined but count is wrong

## Common Issues

### Issue 1: Still showing 0 participants
**Check**: 
- Is backend restarted? (Old code might still be running)
- Are console logs showing "room-users" event?
- What does backend log show for user count?

### Issue 2: Participants appear after refresh but not immediately
**Check**:
- Console logs - is "room-users" event being received?
- Backend logs - is the event being emitted?
- Network tab - is the socket connection stable?

### Issue 3: One user sees participants, other doesn't
**Check**:
- Both consoles - which one is receiving "room-users"?
- Backend logs - is the broadcast going to both sockets?
- Are both users in the same room? (check roomId in logs)

## Debug Commands

### Check Active Users in Backend
Add this temporarily to backend after join:
```javascript
console.log('[DEBUG] watchRoomPresence:', 
  Array.from(watchRoomPresence.entries()).map(([roomId, users]) => ({
    roomId,
    userCount: users.size,
    users: Array.from(users.keys())
  }))
);
```

### Check Frontend State
In browser console:
```javascript
// Check active users state
console.log('Active users:', document.querySelector('[class*="Participants"]'));
```

## Next Steps

If the issue persists after these changes:
1. Share the console logs from both users
2. Share the backend logs
3. Check if socket.io connection is stable (Network tab)
4. Verify both users are using the same roomId
