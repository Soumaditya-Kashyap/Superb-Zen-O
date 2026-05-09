# Participant Refresh Button - User Guide

## Location

The refresh button is located in the **Participants** section header:

```
┌─────────────────────────────────────────┐
│  Participants          1 online  [🔄]   │
│  ─────────────────────────────────────  │
│                                         │
│     ┌───┐                               │
│     │ J │  Jane (You)                   │
│     └───┘  Can control playback         │
│                                         │
└─────────────────────────────────────────┘
```

## When to Use

### ✅ Use the refresh button when:

1. **Participant count seems wrong**
   - Shows "1 online" but you know 2 people are in the room
   - Shows "0 online" but you're connected

2. **Someone rejoined but isn't visible**
   - User left and came back
   - Their avatar doesn't appear

3. **Before important actions**
   - Before starting video playback
   - Before granting playback control
   - To verify everyone is connected

4. **After network issues**
   - Your internet briefly disconnected
   - You see a reconnection message

5. **Just to be sure**
   - Anytime you want to verify the participant list
   - No harm in clicking it!

## How It Works

### Step 1: Click the Button
- Click the circular refresh icon (🔄)
- Located next to the participant count

### Step 2: Wait for Spin
- Button icon spins for ~1 second
- Indicates refresh in progress
- Button is disabled during this time

### Step 3: See Updated List
- Participant list updates automatically
- Console shows: "Participants updated: X users - Name1, Name2"
- Count updates to correct number

## Visual States

### Normal State
```
[🔄]  ← Clickable, ready to refresh
```

### Refreshing State
```
[⟳]  ← Spinning, refresh in progress
```

### After Refresh
```
[🔄]  ← Back to normal, ready for next refresh
```

## Example Scenarios

### Scenario 1: User Rejoins

**Problem**: Zimo left and rejoined, but Jane doesn't see him

**Solution**:
1. Jane clicks refresh button [🔄]
2. Button spins briefly [⟳]
3. Zimo's avatar appears
4. Count updates: "1 online" → "2 online"

### Scenario 2: Wrong Count

**Problem**: Shows "0 online" but both users are connected

**Solution**:
1. Either user clicks refresh button
2. Participant list updates
3. Shows correct count and avatars

### Scenario 3: Before Video Start

**Best Practice**:
1. All users join room
2. Host clicks refresh button
3. Verifies everyone is visible
4. Starts video playback

## Keyboard Shortcut (Future)

Currently: Click only
Future: Could add Ctrl+R or Cmd+R for refresh

## Troubleshooting

### Button doesn't work
- Check console for errors
- Verify socket connection (should see green indicator)
- Try refreshing entire page if button fails

### Still shows wrong count after refresh
- Check backend logs for participant list
- Verify both users are in same room (check room ID)
- Try leaving and rejoining room

### Button keeps spinning
- Wait 2 seconds, should auto-reset
- If stuck, refresh entire page
- Check network connection

## Technical Details

### What happens when you click:

1. **Frontend** sends `request-room-users` event to server
2. **Backend** fetches current participants from memory
3. **Backend** sends `room-users` event back
4. **Frontend** updates participant list
5. **UI** shows updated avatars and count

### Network Request:
```javascript
// Sent to server
{ 
  event: 'request-room-users',
  data: { roomId: '67abc...' }
}

// Received from server
{
  event: 'room-users',
  data: { 
    roomId: '67abc...',
    users: [
      { id: '123', nickName: 'Jane' },
      { id: '456', nickName: 'Zimo' }
    ]
  }
}
```

## Best Practices

1. **Refresh after rejoins**: If someone leaves and comes back, refresh
2. **Refresh before important actions**: Before starting video, granting control
3. **Don't spam**: Wait for spin to complete before clicking again
4. **Check console**: Open DevTools to see detailed logs
5. **Report issues**: If refresh doesn't work, check logs and report

## Comparison: Refresh Button vs Page Reload

| Action | Refresh Button | Page Reload |
|--------|---------------|-------------|
| Speed | ~1 second | ~3-5 seconds |
| Video | Keeps playing | Stops and reloads |
| Chat | Preserved | Preserved |
| Position | Stays same | Resets to top |
| Network | Minimal | Full page load |
| **Recommended** | ✅ Yes | ❌ Only if button fails |

## Future Enhancements

Planned improvements:
- Auto-refresh on rejoin detection
- Show "syncing..." indicator
- Periodic background refresh (every 30s)
- Retry logic for failed refreshes
- Success/error toast notifications
