---
inclusion: auto
---

# Product Overview

Superb is a collaborative movie watching platform that enables users to watch movies together in real-time with synchronized playback, video chat, and messaging features.

## Core Features

- Real-time synchronized video playback across multiple users
- Watch rooms with invite codes for collaborative viewing
- Live chat messaging (both in watch rooms and direct messages)
- User authentication with JWT tokens
- Movie catalog with categories, search, and favorites
- Personalized recommendations
- Notification system for friend requests, messages, and room invites
- Admin dashboard for content management

## Key User Flows

1. Authentication: Users register/login to access the platform
2. Browse Movies: Search, filter by category, view trending content
3. Watch Together: Create/join watch rooms, synchronized playback with friends
4. Social: Chat with friends, send/receive notifications, manage connections
5. Personal Space: Manage favorites, view watch history, update preferences

## Technical Highlights

- Sub-500ms video synchronization using timestamp-based ordering
- Threshold-based drift correction (1.5s tolerance) for smooth playback
- Heartbeat monitoring every 7 seconds for continuous sync
- Playback control permissions (host can grant/revoke control)
- Race condition prevention using client/server timestamps
