# Debug Guide: Zero Participants Issue

## The Problem
Both Jane and Zimo show "0 online" and "No participants online yet" even though both are connected.

## Enhanced Debugging

I've added extensive logging to track exactly what's happening. Here's what to look for:

### Frontend Console Logs (Both Users)

When a user joins, you should see this sequence:

```
[WATCH ROOM] All event listeners registered, connecting socket...
[WATCH ROOM] ========== SOCKET CONNECTED ==========
[WATCH ROOM] Socket ID: abc123...
[WATCH ROOM] Joining room: 67def...
[WATCH ROOM] User: Jane (ID: 507f...)
[WATCH ROOM] join-room event emitted
[WATCH ROOM] ========== END CONNECT ==========

[WATCH ROOM] Room joined: {...}

[WATCH ROOM] ========== ROOM-USERS EVENT RECEIVED ==========
[WATCH ROOM] Payload: {
  "roomId": "67def...",
  "users": [
    {
      "id": "507f...",
      "name": "Jane",
      "nickName": "Jane"
    }
  ]
}
[WATCH ROOM] Parsed users array: [...]
[WATCH ROOM] User count: 1
[WATCH ROOM] Current activeUsers state before update: 0
[WATCH ROOM] setActiveUsers called with 1 users
[WATCH ROOM] Participants updated: 1 users - Jane
[WATCH ROOM] ========== END ROOM-USERS EVENT ==========

[WATCH ROOM] *** activeUsers state changed ***
[WATCH ROOM] New count: 1
[WATCH ROOM] Users: Jane
```

### Backend Console Logs

When a user joins, you should see:

```
[SOCKET] User connected: Jane (507f...)
[SOCKET] Jane is JOINING watch room 67def... for the first time
[SOCKET] Jane joined watch room 67def.... Total users: 1
[SOCKET] Current participants: Jane
[SOCKET] ========== EMITTING ROOM-USERS ==========
[SOCKET] To user: Jane
[SOCKET] Room: 67def...
[SOCKET] Users to send: [
  {
    "id": "507f...",
    "name": "Jane",
    "nickName": "Jane"
  }
]
[SOCKET] ✓ Sent room-users to Jane: Jane
[SOCKET] ✓ Broadcasted room-users to others in room
[SOCKET] ========== END EMITTING ==========
```

## Testing Steps

### Step 1: Restart Backend
```bash
cd backend
npm start
```

### Step 2: Open Two Browser Windows
- Window 1: Jane
- Window 2: Zimo
- Both with console open (F12)

### Step 3: Zimo Joins First
1. Zimo opens watch room
2. **Check Zimo's console** - should see all the logs above
3. **Check backend** - should see Zimo joining
4. **Check Zimo's UI** - should show "1 online" with Zimo's avatar

### Step 4: Jane Joins Second
1. Jane opens same watch room
2. **Check Jane's console** - should see logs with 2 users
3. **Check Zimo's console** - should see room-users event with 2 users
4. **Check backend** - should show Jane joining, total 2 users
5. **Check both UIs** - should show "2 online" with both avatars

## What to Look For

### ❌ Problem Indicators

**If you see "0 online":**
1. Check if `room-users` event was received (search for "ROOM-USERS EVENT RECEIVED")
2. Check if the users array is empty
3. Check if `activeUsers state changed` shows count 0

**If room-users event NOT received:**
- Socket might not be connected
- Event listener might not be registered
- Backend might not be sending the event

**If room-users event received but users array is empty:**
- Backend presence map might be empty
- Check backend logs for "Users to send"

**If activeUsers state doesn't change:**
- React state update might be failing
- Check for errors in console

### ✅ Success Indicators

- Console shows "ROOM-USERS EVENT RECEIVED"
- Users array has correct number of users
- "activeUsers state changed" shows correct count
- UI shows correct participant count and avatars

## Diagnostic Questions

### Question 1: Is the socket connecting?
Look for: "SOCKET CONNECTED" in console
- If NO: Check network, check token, check backend running
- If YES: Continue to Q2

### Question 2: Is join-room being emitted?
Look for: "join-room event emitted" in console
- If NO: Check if connect handler is registered
- If YES: Continue to Q3

### Question 3: Is backend receiving join-room?
Look for: "[SOCKET] User connected: [Name]" in backend
- If NO: Check socket connection, check auth
- If YES: Continue to Q4

### Question 4: Is backend sending room-users?
Look for: "EMITTING ROOM-USERS" in backend
- If NO: Check if join-room handler is working
- If YES: Continue to Q5

### Question 5: Is frontend receiving room-users?
Look for: "ROOM-USERS EVENT RECEIVED" in console
- If NO: Event listener issue or socket disconnected
- If YES: Continue to Q6

### Question 6: Is the users array populated?
Look for: "User count: X" in console (X should be > 0)
- If 0: Backend presence map is empty
- If > 0: Continue to Q7

### Question 7: Is setActiveUsers being called?
Look for: "setActiveUsers called with X users"
- If NO: Code path issue
- If YES: Continue to Q8

### Question 8: Is activeUsers state updating?
Look for: "activeUsers state changed" with correct count
- If NO: React state update failing
- If YES: UI should show participants

## Common Issues & Fixes

### Issue 1: room-users event not received
**Cause**: Event listener not registered before socket connects
**Fix**: Verify `autoConnect: false` and `socket.connect()` at end

### Issue 2: Users array is empty
**Cause**: Backend presence map not populated
**Fix**: Check backend join-room handler, verify roomUsers.set() is called

### Issue 3: State updates but UI doesn't
**Cause**: React rendering issue
**Fix**: Check if activeUsers is being used correctly in JSX

### Issue 4: Refresh button doesn't work
**Cause**: request-room-users not working
**Fix**: Check if handler exists in backend, check acknowledgment

## Next Steps

1. **Restart backend** with new logging
2. **Hard refresh both browsers** (Ctrl+Shift+R)
3. **Follow test steps** above
4. **Share console logs** from both users if issue persists
5. **Share backend logs** showing the join sequence

The enhanced logging will show us exactly where the flow breaks!
