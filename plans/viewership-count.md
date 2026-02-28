# 📡 Realtime Viewer Count — Integration Skill

> Reference document for implementing realtime viewer counts, chat, and analytics in the Volantis livestream platform.

---

## Overview

There are **three layers** of viewer/view tracking in this system:

| Layer | What it tracks | Where |
|---|---|---|
| `viewer_count` on `VolLiveStream` | Currently connected sockets (live) | WebSocket join/leave |
| `total_views` on `VolLiveStream` | Cumulative unique viewers who ever joined | Incremented once per new `AnonymousViewer` record |
| `LiveStreamView` table | Unique daily views (per IP or per user) | `record_view_once_per_day_*()` functions |

---

## 1. WebSocket — Anonymous Viewer (No Auth)

**Use this for: real-time viewer count display on a live stream page.**

### Connection URL

```
ws://<host>/livestream/ws/{slug}?company_id=1&name=OptionalName
```

- `slug` — the livestream slug (e.g. `my-stream`)
- `company_id` — required, integer
- `name` — optional display name; auto-generated as `Viewer_abc123` if omitted

### Events You Will Receive

#### `viewer_joined` — sent only to **you** on connect
```json
{
  "event": "viewer_joined",
  "data": {
    "viewer_id": 42,
    "name": "Viewer_abc123",
    "viewer_count": 17,
    "stream_title": "Live Q&A with Daniel"
  }
}
```

#### `viewer_count_update` — broadcast to **all** when anyone joins or leaves
```json
{
  "event": "viewer_count_update",
  "data": {
    "count": 18
  }
}
```

> ✅ Listen for `viewer_count_update` to keep a live viewer counter updated in your UI.

### Count Logic (Join)
1. Check if this IP already has an active `AnonymousViewer` record for this stream.
2. If **new viewer**: create `AnonymousViewer`, increment `stream.viewer_count`, increment `stream.total_views`, update `stream.peak_viewers` if needed.
3. If **reconnecting same IP**: reuse record (no double-count), optionally update name.
4. Broadcast `viewer_count_update` to all sockets in the room.

### Count Logic (Leave / Disconnect)
1. Set `viewer.left_at = now`, calculate `watch_duration_seconds`.
2. Decrement `stream.viewer_count` (never below 0).
3. Broadcast updated `viewer_count_update` to room.

### Anonymous viewers are **read-only** — they receive messages but cannot send chat.

---

## 2. WebSocket — Chat (Authenticated + Anonymous)

**Use this for: chat messages and presence tracking on the stream page.**

### Connection URL

```
ws://<host>/ws/chat/{slug}?token=<jwt>&name=OptionalName
```

- `token` — optional JWT; if omitted, connects as anonymous
- `name` — optional display name for anonymous users

### Events You Will Receive

#### `welcome` — on connect
```json
{
  "event": "welcome",
  "data": {
    "stream_slug": "my-stream",
    "stream_title": "Live Q&A",
    "viewer_name": "daniel",
    "viewer_id": 7,
    "is_authenticated": true
  }
}
```

#### `presence` — broadcast when anyone joins or leaves
```json
{
  "event": "presence",
  "count": 23
}
```

#### `chat_message` — broadcast when anyone sends a message
```json
{
  "event": "chat_message",
  "data": {
    "id": "msg_1709042400000",
    "viewer_id": 7,
    "viewer_name": "daniel",
    "is_authenticated": true,
    "message": "Hello everyone!",
    "timestamp": "2025-02-27T11:11:00.000000"
  }
}
```

#### `typing` — broadcast when someone is typing
```json
{
  "event": "typing",
  "data": {
    "viewer_id": 7,
    "viewer_name": "daniel",
    "is_authenticated": true,
    "is_typing": true
  }
}
```

#### `ping` — keep-alive sent every ~5 seconds
```json
{
  "event": "ping",
  "ts": "2025-02-27T11:11:05.000000"
}
```

#### `rate_limited` — if you send too many messages
```json
{
  "event": "rate_limited",
  "message": "Too many messages. Please slow down."
}
```

### Events You Can Send (from client)

```json
// Send a chat message
{ "event": "message", "message": "Hello!" }

// Typing indicator
{ "event": "typing", "is_typing": true }
```

> **Rate limit:** max 5 messages per 10-second window.

---

## 3. REST — Realtime Stats Polling

**Use this for: server-side rendering, or polling fallback if WebSocket isn't available.**

### Realtime Viewer Count

```
GET /stream/{slug}/realtime
```

Response:
```json
{
  "slug": "my-stream",
  "is_active": true,
  "viewer_count": 42,
  "peak_viewers": 150,
  "total_views": 1234,
  "websocket_url": "ws://<host>/livestream/ws/my-stream?company_id=1"
}
```

### Current Connected Anonymous Viewers (count only)

```
GET /livestream/{slug}/viewers/count?company_id=1
```

Response:
```json
{
  "slug": "my-stream",
  "viewer_count": 42,
  "anonymous_viewers": 38,
  "is_live": true
}
```

### Current Connected Anonymous Viewers (list)

```
GET /livestream/{slug}/viewers?limit=50
```

Response:
```json
{
  "slug": "my-stream",
  "viewers": [
    {
      "id": 1,
      "name": "Viewer_abc123",
      "joined_at": "2025-02-27T11:00:00",
      "watch_duration": null
    }
  ],
  "total": 1
}
```

---

## 4. REST — Stream Page / Total Views

```
GET /stream/{slug}
```

- Records a page view (per-day deduplication by IP or user)
- Returns `total_views` and `unique_view_count`

---

## 5. Recording Replay Views

| Purpose | Endpoint | Effect |
|---|---|---|
| Get replay stats | `GET /recordings/public/{id}/stats` | **No** count increment |
| Watch/increment replay | `GET /recordings/public/{id}` | Increments `replay_count` once per day per IP/user |

---

## 6. Dashboard API — Company Summary

Example response from the company dashboard endpoint:
```json
{
  "company_slug": "test",
  "company_name": "Daniels Jams",
  "total_streams": 9,
  "total_streamed_time": { "hours": -7, "minutes": 41 },
  "subscriber_count": 2,
  "current_viewers": 0,
  "is_live": true,
  "active_stream_title": "new stream"
}
```

> `current_viewers` here maps to `stream.viewer_count` for the active stream.

---

## 7. Analytics — Vercel Analytics (Frontend)

For page-level analytics tracking (separate from viewer counts):

```bash
npm i @vercel/analytics
```

```tsx
// In your app layout (Next.js)
import { Analytics } from "@vercel/analytics/next"

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  )
}
```

- Deploy and visit your site to start collecting page views.
- If no data appears after 30 seconds, check for content blockers or navigate between pages.

> Note: Vercel Analytics tracks **page views**, not concurrent live viewers. Use the WebSocket or REST endpoints above for live viewer counts.

---

## 8. How to Display in UI — Decision Table

| Use Case | Recommended Approach |
|---|---|
| Live viewer count badge | WebSocket `viewer_count_update` event |
| Presence / online count in chat | WebSocket `presence` event from chat endpoint |
| SSR / initial page load count | `GET /stream/{slug}/realtime` |
| Fallback polling (no WebSocket) | Poll `/stream/{slug}/realtime` every 5–10s |
| Total unique views (lifetime) | `GET /stream/{slug}` → `total_views` |
| Peak viewers stat | `GET /stream/{slug}/realtime` → `peak_viewers` |
| Recording replay count | `GET /recordings/public/{id}/stats` → `replay_count` |
| Count a recording view | `GET /recordings/public/{id}` (increments) |

---

## 9. Quick Implementation Checklist for Agent

- [ ] Connect to `ws://<host>/livestream/ws/{slug}?company_id=<id>` on page load
- [ ] Listen for `viewer_count_update` → update viewer count state
- [ ] On WebSocket error/close → fall back to polling `/stream/{slug}/realtime`
- [ ] Show `viewer_count` from `viewer_joined` event as initial count
- [ ] For chat: connect to `/ws/chat/{slug}?token=<jwt>` (or without token for anon)
- [ ] Listen for `presence` events on chat socket to show online count
- [ ] Send `{ "event": "message", "message": "..." }` to broadcast chat
- [ ] Respect rate limit (5 messages / 10s) — show toast on `rate_limited` event
- [ ] On disconnect: reconnect with exponential backoff