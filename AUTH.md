# Volantis Authentication System

Cross-subdomain authentication for `volantislive.com` and subdomains like `meet.volantislive.com`.

## Overview

Authentication tokens are stored in HTTP-only cookies shared across all subdomains via the `.volantislive.com` domain.

## Cookie Format

All auth cookies use:
- **Domain**: `.volantislive.com` (accessible to all subdomains)
- **Path**: `/`
- **SameSite**: `lax`
- **Secure**: `true` in production

### Cookie Names

| Cookie | Description | Expiration |
|--------|-------------|------------|
| `vol_access_token` | JWT access token | `expires_in` from response (seconds) |
| `vol_refresh_token` | Refresh token | Same as access token |
| `vol_token_expires` | Token expiration duration | Same as access token |
| `vol_user` | Cached user object | 7 days |

## API Endpoints

### Base URL
 `https://api-dev.volantislive.com`

### POST `/auth/login`
**Purpose**: User login with email/password

**Request**:
```typescript
{
  email: string;
  password: string;
}
```
Content-Type: `application/x-www-form-urlencoded`

**Response (200)**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### POST `/auth/signup`
**Purpose**: Register new company with admin user

**Request**: FormData
```
company_name: string
email: string
password: string
company_slug?: string
company_description?: string
user_username?: string
logo?: File
```

**Response (200)**:
```json
{
  "message": "Company created successfully",
  "email": "user@example.com",
  "user_id": 123,
  "company_slug": "mycompany",
  "requires_verification": true,
  "access_token": "eyJ...",       // if auto-login enabled
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### POST `/auth/signup/user`
**Purpose**: Individual user signup (not tied to company)

**Request**: FormData
```
email: string
password: string
username: string
```

**Response**: Same as `/auth/signup`

### POST `/auth/logout`
**Purpose**: Invalidate tokens

**Response (200)**:
```json
{ "message": "Logged out successfully" }
```

### GET `/auth/me`
**Purpose**: Get current user info

**Headers**: `Authorization: Bearer <access_token>`

**Response (200)**:
```json
{
  "id": 123,
  "company_id": 456,
  "company_name": "My Company",
  "company_slug": "mycompany",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "admin",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### POST `/auth/password-reset`
**Purpose**: Request password reset OTP

**Request**:
```json
{ "email": "user@example.com" }
```

**Response (200)**:
```json
{ "message": "Reset instructions sent" }
```

### POST `/auth/password-reset/verify`
**Purpose**: Verify OTP and set new password

**Request**:
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "securepassword"
}
```

**Response (200)**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## Client-Side Implementation

### Cookie Utilities (`src/lib/api/cookies.ts`)

```typescript
import { setAuthCookies, clearAuthCookies, getAccessTokenFromCookie } from '@/lib/api/cookies';

// Set cookies after login
setAuthCookies(accessToken, refreshToken, expiresIn);

// Clear cookies on logout
clearAuthCookies();

// Read token for API requests
const token = getAccessTokenFromCookie();
```

### API Client (`src/lib/api/client.ts`)

The client automatically reads `vol_access_token` from cookies and adds it to requests:

```typescript
import { apiClient } from '@/lib/api/client';

// All requests automatically include Authorization header if cookie exists
```

### Auth API (`src/lib/api/auth.ts`)

```typescript
import { authApi } from '@/lib/api/auth';

// Login
const { access_token, refresh_token, expires_in } = await authApi.login({
  email: 'user@example.com',
  password: 'password123'
});

// Check auth status
if (authApi.isAuthenticated()) { ... }

// Logout
await authApi.logout();
```

## Subdomain Authentication

When implementing `meet.volantislive.com`:

1. **Read cookies**: The `vol_access_token` cookie is automatically available
2. **Include token in requests**: Pass cookie to your API client
3. **Verify with backend**: Always validate JWT on your subdomain's API

### Example: Reading Token on Subdomain

```typescript
function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/vol_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Use in API calls
const token = getAuthToken();
if (token) {
  const response = await fetch('https://api.volantislive.com/meetings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### Example: Middleware Protection (Next.js)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('vol_access_token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/meet')) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/meet', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/meet/:path*']
};
```

## Error Responses

Standard error format:
```json
{
  "detail": "Error message here"
}
```

Common status codes:
- `400` - Bad request / validation errors
- `401` - Invalid or expired token
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `422` - Unprocessable entity

## Security Notes

1. **HTTPS Only**: Cookies use `secure` flag in production
2. **SameSite=Lax**: Cookies sent with top-level cross-site requests
3. **Domain=.volantislive.com**: Accessible to all subdomains
4. **Token Expiration**: Access tokens expire per `expires_in` value
5. **Server Validation**: Always validate tokens on the server side