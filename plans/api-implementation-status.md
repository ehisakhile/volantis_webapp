# API Implementation Status

Generated: 2026-02-28

This document tracks which APIs from `openapi.json` have been implemented in `src/lib/api/` and what remains to be implemented.

---

## Summary

| Category | Implemented | Not Implemented | Total |
|----------|-------------|-----------------|-------|
| volantis-auth | 11 | 1 | 12 |
| volantis-companies | 4 | 7 | 11 |
| volantis-livestreams | 12 | 1 | 13 |
| volantis-public-livestreams | 1 | 0 | 1 |
| volantis-chat | 4 | 0 | 4 |
| volantis-recordings | 14 | 1 | 15 |
| volantis-platform-owners | 1 | 11 | 12 |
| volantis-subscriptions | 5 | 0 | 5 |
| volantis-anonymous-viewers | 2 | 0 | 2 |
| telegram | 0 | 10 | 10 |
| **Total** | **54** | **31** | **85** |

---

## New Features Implemented

### Realtime Viewer Count (WebSocket + Polling)

| Feature | Implemented | Location |
|---------|-------------|----------|
| WebSocket Viewer Service | ✅ Yes | `viewer-websocket.ts` |
| useViewerCount React Hook | ✅ Yes | `useViewerCount.ts` |
| GET /stream/{slug}/realtime | ✅ Yes | `livestream.ts` |
| GET /livestream/{slug}/viewers/count | ✅ Yes | `livestream.ts` |
| GET /livestream/{slug}/viewers | ✅ Yes | `livestream.ts` |
| GET /recordings/public/{id}/stats | ✅ Yes | `recordings.ts` |

### WebSocket Details

**Viewer Count WebSocket:** `wss://<host>/livestream/ws/{slug}?company_id=<id>`

Events received:
- `viewer_joined` - sent to you on connect with initial viewer count
- `viewer_count_update` - broadcast to all when anyone joins/leaves

The hook automatically:
- Connects via WebSocket for real-time updates
- Falls back to polling every 10 seconds if WebSocket fails
- Reconnects on page visibility change
- Handles reconnection with exponential backoff

---

## Detailed Implementation Status

### volantis-auth

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /auth/signup | POST | ✅ Yes | `auth.ts` |
| /auth/login | POST | ✅ Yes | `auth.ts` |
| /auth/verify-email | POST | ✅ Yes | `auth.ts` |
| /auth/resend-verification | POST | ✅ Yes | `auth.ts` |
| /auth/signup/user | POST | ✅ Yes | `auth.ts` |
| /auth/logout | POST | ✅ Yes | `auth.ts` |
| /auth/me | GET | ✅ Yes | `auth.ts` |
| /auth/verification-status | GET | ✅ Yes | `auth.ts` |
| /auth/admin/login | POST | ✅ Yes | `auth.ts` (adminLogin) |
| /auth/subscribe/{company_slug} | POST | ⚠️ Different endpoint | `auth.ts` |
| /auth/subscribe/{company_slug} | DELETE | ⚠️ Different endpoint | `auth.ts` |
| /subscriptions | GET | ✅ Yes | `auth.ts` (getMySubscriptions) |

**Status**: Fully implemented (subscription endpoints use different paths but functionality exists)

---

### volantis-companies

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /companies/me | GET | ✅ Yes | `company.ts` |
| /companies/me | PUT | ✅ Yes | `company.ts` |
| /companies/me | DELETE | ✅ Yes | `company.ts` |
| /companies/search | GET | ❌ No | - |
| /companies/{company_slug} | GET | ✅ Yes | `company.ts` |
| /companies/{company_id}/members | GET | ❌ No | - |
| /companies/{company_id}/users | POST | ❌ No | - |
| /companies/users/{user_id} | GET | ❌ No | - |
| /companies/users/{user_id} | DELETE | ❌ No | - |
| /companies/me/views | GET | ❌ No | - |
| /companies/subscriptions/{company_slug} | POST | ❌ No | - |
| /companies/subscriptions/{company_slug} | DELETE | ❌ No | - |
| /companies/subscriptions | GET | ❌ No | - |

**Status**: 4/11 implemented (36%)

**Priority Implementations Needed:**
1. `/companies/search` - Search companies by name
2. `/companies/me/views` - Get company view metrics
3. `/companies/{company_id}/members` - Get company members
4. `/companies/{company_id}/users` - Add user to company
5. `/companies/users/{user_id}` - Get/delete user
6. Company subscription endpoints

---

### volantis-livestreams

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /livestreams/start/audio | POST | ✅ Yes | `livestream.ts` |
| /livestreams/start/video | POST | ✅ Yes | `livestream.ts` |
| /livestreams/{slug}/playback | GET | ✅ Yes | `livestream.ts` |
| /livestreams/{slug}/stop | POST | ✅ Yes | `livestream.ts` |
| /livestreams | GET | ✅ Yes | `livestream.ts` |
| /livestreams/{slug} | GET | ✅ Yes | `livestream.ts` |
| /livestreams/{slug}/upload-recording | POST | ✅ Yes | `livestream.ts` |
| /livestreams/active | GET | ✅ Yes | `livestream.ts` |
| /livestreams/{slug}/viewers | GET | ✅ Yes | `livestream.ts` |
| /livestreams/{slug}/viewers/count | GET | ✅ Yes | `livestream.ts` |
| /stream/{slug}/realtime | GET | ✅ Yes | `livestream.ts` |

**Status**: 12/13 implemented (92%)

---

### volantis-chat

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /livestream-chat/{slug}/messages | GET | ✅ Yes | `chat.ts` |
| /livestream-chat/{slug}/messages | POST | ✅ Yes | `chat.ts` |
| /livestream-chat/messages/{message_id}/edit | PUT | ✅ Yes | `chat.ts` |
| /livestream-chat/messages/{message_id} | DELETE | ✅ Yes | `chat.ts` |

**Status**: Fully implemented (4/4)

---

### volantis-recordings

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /recordings/upload | POST | ✅ Yes | `recordings.ts` |
| /recordings | GET | ✅ Yes | `recordings.ts` |
| /recordings/{company_slug} | GET | ❌ No | - |
| /recordings/{recording_id} | GET | ✅ Yes | `recordings.ts` |
| /recordings/{recording_id} | DELETE | ✅ Yes | `recordings.ts` |
| /recordings/public/{recording_id} | GET | ✅ Yes | `recordings.ts` |
| /recordings/public/{recording_id}/stats | GET | ✅ Yes | `recordings.ts` |
| /recordings/public/company/{company_slug} | GET | ✅ Yes | `recordings.ts` |
| /recordings/{recording_id}/complete | POST | ✅ Yes | `recordings.ts` |
| /recordings/{recording_id}/position | POST | ✅ Yes | `recordings.ts` |
| /recordings/stream/{recording_id} | GET | ❌ No | - |
| /recordings/stream/{recording_id} | OPTIONS | ❌ No | - |
| /recordings/my/watch-history | GET | ✅ Yes | `recordings.ts` |
| /recordings/my/watching | GET | ✅ Yes | `recordings.ts` |
| /recordings/my/watched | GET | ✅ Yes | `recordings.ts` |

**Status**: 14/15 implemented (93%)

**Remaining:**
1. `/recordings/stream/{recording_id}` - Stream recording with range support (backend feature)

---

### volantis-platform-owners

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /platform-owners/login | POST | ✅ Yes | `auth.ts` (adminLogin) |
| /platform-owners/stats | GET | ❌ No | - |
| /platform-owners/companies | GET | ❌ No | - |
| /platform-owners/companies/{company_id} | GET | ❌ No | - |
| /platform-owners/companies/{company_id}/toggle-active | PUT | ❌ No | - |
| /platform-owners/users | GET | ❌ No | - |
| /platform-owners/users/{user_id} | GET | ❌ No | - |
| /platform-owners/users/{user_id}/toggle-active | PUT | ❌ No | - |
| /platform-owners/users/{user_id}/role | PUT | ❌ No | - |
| /platform-owners/livestreams | GET | ❌ No | - |
| /platform-owners/livestreams/{stream_id} | GET | ❌ No | - |
| /platform-owners/recordings | GET | ❌ No | - |

**Status**: 1/12 implemented (8%)

**Note**: Admin functionality is typically not needed in frontend client apps. These endpoints would only be needed for a dedicated admin dashboard.

---

### volantis-subscriptions

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /subscriptions/{company_slug}/subscribe | POST | ✅ Yes | `subscriptions.ts` |
| /subscriptions/{company_slug}/unsubscribe | DELETE | ✅ Yes | `subscriptions.ts` |
| /subscriptions | GET | ✅ Yes | `subscriptions.ts` |
| /subscriptions/{company_slug}/subscribers/count | GET | ✅ Yes | `subscriptions.ts` |
| /subscriptions/{company_slug}/stats | GET | ✅ Yes | `subscriptions.ts` |

**Status**: Fully implemented (5/5)

---

### volantis-anonymous-viewers

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /livestream/{slug}/viewers/count | GET | ✅ Yes | `livestream.ts` |
| /livestream/{slug}/viewers | GET | ✅ Yes | `livestream.ts` |

**Status**: Fully implemented (2/2)

**Priority Implementations Needed:**
1. Viewer count and list endpoints for public livestream pages

---

### telegram

All Telegram integration endpoints are NOT implemented.

| Endpoint | Method | Implemented | Location |
|----------|--------|-------------|----------|
| /telegram/health | GET | ❌ No | - |
| /telegram/start | POST | ❌ No | - |
| /telegram/verify | POST | ❌ No | - |
| /telegram/connect | POST | ❌ No | - |
| /telegram/connections | GET | ❌ No | - |
| /telegram/connection/{connection_id} | DELETE | ❌ No | - |
| /telegram/{connection_id}/import-history | POST | ❌ No | - |
| /telegram/{connection_id}/import-new | POST | ❌ No | - |
| /telegram/{connection_id}/media | GET | ❌ No | - |
| /telegram/{connection_id}/channel-media | GET | ❌ No | - |
| /telegram/{connection_id}/import-media/{message_id} | POST | ❌ No | - |

**Status**: 0/11 implemented (0%)

**Note**: Telegram integration appears to be a backend feature for importing content from Telegram channels. Frontend implementation depends on whether this feature is needed for the user-facing application.

---

## Recommendations

### High Priority (User-Facing Features)
1. **Company APIs** - Search, members management, view metrics
2. **Viewer APIs** - Viewer count for livestreams
3. **Subscription APIs** - Subscribe/unsubscribe, subscriber count, stats

### Medium Priority (Enhanced Features)
1. **Recording Stats** - Public stats endpoint
2. **Recording Streaming** - Direct streaming with range requests

### Low Priority (Admin/Backend Features)
1. **Platform Owners** - Only needed for admin dashboard
2. **Telegram** - Only needed if Telegram integration is required

---

## Implementation Notes

### Endpoint Discrepancies Found

1. **Subscriptions**: The frontend uses `/auth/subscribe/{slug}` while OpenAPI specifies `/subscriptions/{slug}/subscribe`. Both are implemented in `auth.ts`.

2. **Admin Login**: Uses `/auth/admin/login` which maps to `/platform-owners/login` in OpenAPI.

3. **Public vs Authenticated**: Several recording endpoints have both public (`/recordings/public/...`) and authenticated (`/recordings/...`) versions. The public versions are implemented.
