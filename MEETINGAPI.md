
---

# Volantis Meetings API Documentation

This document covers all endpoints related to **meetings** (video/audio conferencing) in the Volantis platform.
All endpoints tagged with `volantis-meetings`.

---

## Base URL

All endpoints are relative to the API base URL:

```
https://api.volantislive.com
```

---

## Authentication

Most endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Public endpoints (e.g., `GET /meetings/active`, `GET /meetings/{meeting_id}/playback`) do not require authentication.

---

## Endpoints Summary

| Method | Endpoint                              | Description                                 | Auth |
| ------ | ------------------------------------- | ------------------------------------------- | ---- |
| POST   | `/meetings/instant`                   | Create and start an instant meeting         | ✅    |
| POST   | `/meetings/schedule`                  | Create a scheduled meeting (pending)        | ✅    |
| POST   | `/meetings/{meeting_id}/start`        | Start a scheduled meeting                   | ✅    |
| POST   | `/meetings/{meeting_id}/join`         | Join an active meeting                      | ✅    |
| POST   | `/meetings/{meeting_id}/leave`        | Leave a meeting                             | ✅    |
| POST   | `/meetings/{meeting_id}/end`          | End an active meeting                       | ✅    |
| GET    | `/meetings/{meeting_id}/playback`     | Get playback URLs (public)                  | ❌    |
| GET    | `/meetings/{meeting_id}/participants` | List meeting participants                   | ✅    |
| GET    | `/meetings`                           | Get current user's meetings                 | ✅    |
| GET    | `/meetings/active`                    | List all active meetings (public discovery) | ❌    |
| GET    | `/meetings/{meeting_id}`              | Get meeting details                         | ✅    |
| PATCH  | `/meetings/{meeting_id}`              | Update meeting details                      | ✅    |
| DELETE | `/meetings/{meeting_id}`              | Cancel a scheduled meeting                  | ✅    |

---

## Common Schemas

### `MeetingStatus`

```json
["pending", "active", "ended", "cancelled"]
```

### `MeetingType`

```json
["instant", "scheduled"]
```

### `ParticipantRole`

```json
["host", "co_host", "participant"]
```

### `StreamType-Input`

```json
["audio_only", "video"]
```

---

### `VolMeetingOut` (partial – key fields for frontend)

```json
{
  "id": 123,
  "company_id": 456,
  "created_by_id": 789,
  "title": "Team Sync",
  "description": "Weekly meeting",
  "meeting_type": "instant",
  "status": "active",
  "scheduled_start_time": "2026-05-21T14:00:00Z",
  "scheduled_end_time": null,
  "actual_start_time": "2026-05-21T14:05:00Z",
  "actual_end_time": null,
  "stream_type": "video",
  "max_participants": 25,
  "participant_count": 3,
  "peak_participants": 5,
  "total_views": 10,
  "thumbnail_url": "https://...",
  "cf_webrtc_publish_url": "https://...",
  "cf_webrtc_playback_url": "https://...",
  "cf_rtmps_url": "rtmps://...",
  "cf_stream_key": "...",
  "cf_status": "connected",
  "created_at": "2026-05-21T14:00:00Z",
  "company_name": "NobleInChrist",
  "company_slug": "nobleinchrist",
  "created_by_email": "admin@example.com",
  "playback": {},
  "participants": []
}
```

---

### `VolMeetingPlaybackOut`

```json
{
  "status": "idle",
  "video_uid": "abc123",
  "hls_url": "https://.../manifest.m3u8",
  "dash_url": "https://.../manifest.mpd",
  "preview_url": "https://.../thumbnail.jpg",
  "webrtc_playback_url": "https://..."
}
```

---

### `VolMeetingParticipantOut`

```json
{
  "id": 1,
  "user_id": 100,
  "role": "participant",
  "status": "joined",
  "joined_at": "2026-05-21T14:10:00Z",
  "left_at": null,
  "user_email": "user@example.com",
  "user_username": "john_doe"
}
```

---

# Endpoints

---

## 1. Create & Start Instant Meeting

**POST** `/meetings/instant`

Creates and immediately starts an instant meeting.

### Headers

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Form Data

| Field            | Type    | Required | Description                       |
| ---------------- | ------- | -------- | --------------------------------- |
| title            | string  | ✅        | 1–255 chars                       |
| description      | string  | ❌        | Max 2000 chars                    |
| stream_type      | string  | ❌        | `video` (default) or `audio_only` |
| max_participants | integer | ❌        | 2–100, default 25                 |
| thumbnail        | file    | ❌        | Image                             |

### Response

Returns `VolMeetingOut` (`status: active`).

---

## 2. Create Scheduled Meeting

**POST** `/meetings/schedule`

Creates a future meeting (`status: pending`).

### Required Field

* `scheduled_start_time` (ISO 8601)

---

## 3. Start Scheduled Meeting

**POST** `/meetings/{meeting_id}/start`

Activates a scheduled meeting.

* Host/admin only
* Populates Cloudflare streaming URLs

---

## 4. Join Meeting

**POST** `/meetings/{meeting_id}/join`

Optional role:

* `host`
* `co_host`
* `participant` (default)

---

## 5. Leave Meeting

**POST** `/meetings/{meeting_id}/leave`

Marks participant as left.

---

## 6. End Meeting

**POST** `/meetings/{meeting_id}/end`

* Host/admin only
* Sets status to `ended`

---

## 7. Get Playback (Public)

**GET** `/meetings/{meeting_id}/playback`

No authentication required.

---

## 8. List Participants

**GET** `/meetings/{meeting_id}/participants`

Returns all participants.

---

## 9. Get My Meetings

**GET** `/meetings`

### Query Params

| Param        | Description                          |
| ------------ | ------------------------------------ |
| status       | pending / active / ended / cancelled |
| meeting_type | instant / scheduled                  |
| limit        | 1–100                                |
| offset       | pagination                           |

---

## 10. Get Active Meetings (Public)

**GET** `/meetings/active`

Lists all active meetings.

---

## 11. Get Meeting Details

**GET** `/meetings/{meeting_id}`

Returns full meeting object.

---

## 12. Update Meeting

**PATCH** `/meetings/{meeting_id}`

Only for **pending meetings**.

---

## 13. Cancel Meeting

**DELETE** `/meetings/{meeting_id}`

Sets status to `cancelled`.

---

# Frontend Integration Notes

### WebRTC Broadcasting (Host)

* `cf_webrtc_publish_url` → WHIP
* `cf_stream_key` + `cf_rtmps_url` → fallback

---

### WebRTC Playback (Viewer)

* `cf_webrtc_playback_url` → WHEP
* HLS/DASH available

---

### Real-time Updates

WebSocket:

```
ws://<host>/ws/meeting/{meeting_id}
```

Events:

* `participant_joined`
* `participant_left`
* `meeting_ended`

---

### View Tracking

* `total_views` increments automatically
* Use playback endpoint for public tracking

---

### Timezones

Use ISO 8601 with timezone (`Z` or offset).

---

# Error Handling

| Code | Meaning          |
| ---- | ---------------- |
| 200  | Success          |
| 400  | Validation error |
| 401  | Unauthorized     |
| 403  | Forbidden        |
| 404  | Not found        |
| 422  | Invalid data     |

### Example

```json
{
  "detail": [
    {
      "loc": ["body", "title"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

# WebSocket

| Endpoint                              | Description       |
| ------------------------------------- | ----------------- |
| `ws://<host>/ws/meeting/{meeting_id}` | Real-time updates |

Auth via JWT (query or handshake).

---

## ✅ Summary

This API enables:

* Instant & scheduled meetings
* Real-time participation
* WebRTC streaming (WHIP/WHEP)
* Playback & discovery
* Full meeting lifecycle management