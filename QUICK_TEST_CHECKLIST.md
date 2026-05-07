# Quick Test Checklist

## Before Testing
- [ ] Backend restarted with latest code
- [ ] Frontend hard refreshed (Ctrl+Shift+R)
- [ ] Browser console open (F12) for both users
- [ ] Backend console visible

## Test Scenario: Two Users Join

### Step 1: Jane Joins
- [ ] Jane opens watch room
- [ ] Jane sees "1 online"
- [ ] Jane sees her own avatar
- [ ] Console shows: "Participants updated: 1 users - Jane"
- [ ] Backend shows: "Jane joined... Total users: 1"

### Step 2: Zimo Joins
- [ ] Zimo opens same room
- [ ] **Zimo sees "2 online"** ← CRITICAL
- [ ] **Zimo sees BOTH avatars (Jane + Zimo)** ← CRITICAL
- [ ] Console shows: "Participants updated: 2 users - Jane, Zimo"
- [ ] Backend shows: "Zimo joined... Total users: 2"

### Step 3: Jane Auto-Updates
- [ ] **Jane's screen updates to "2 online"** ← CRITICAL
- [ ] **Jane sees BOTH avatars (Jane + Zimo)** ← CRITICAL
- [ ] Console shows: "Participants updated: 2 users - Jane, Zimo"
- [ ] **NO REFRESH NEEDED** ← CRITICAL

## If Any Step Fails

### Try Refresh Button
- [ ] Click 🔄 button next to "X online"
- [ ] Button spins briefly
- [ ] Participants update
- [ ] If this works, there's still a timing issue

### Check Console Logs
Look for these in order:
1. "All event listeners registered, connecting socket..."
2. "Socket connected, joining room: ..."
3. "Room users update received: ..."
4. "Participants updated: X users - ..."

### Check Backend Logs
Look for:
1. "User connected: [Name]"
2. "[Name] is JOINING watch room..."
3. "[Name] joined... Total users: X"
4. "Sent room-users to [Name]: ..."

## Success Criteria

✅ **All checks must pass:**
- Zimo sees himself immediately (no refresh)
- Jane sees Zimo immediately (no refresh)
- Both see "2 online"
- Both see 2 avatars
- Console logs show proper event flow
- Backend logs show 2 users

## If Still Failing

1. Share console logs from both users
2. Share backend logs
3. Check if `autoConnect: false` is in code
4. Check if `socket.connect()` is called
5. Verify backend has `setImmediate` wrapper
