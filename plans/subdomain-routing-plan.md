# Multi-Tenant Subdomain Implementation Plan

## Overview

This plan outlines the implementation of multi-tenant subdomains for company-specific streaming pages. The architecture will support both subdomain-based routing (`[company].domain.com`) and the existing path-based routing (`domain.com/[company]`) as a fallback.

## Architecture Diagram

```mermaid
flowchart TD
    A[User Request] --> B{Request Host}
    
    B --> C[www.domain.com]
    B --> D[domain.com]
    B --> E[company1.domain.com]
    B --> F[company2.domain.com]
    
    C --> G[Landing Page / Company Discovery]
    D --> G
    
    E --> H{Path}
    H --> I[/] --> J[Company Page]
    H --> K[/streamSlug] --> L[Stream Page]
    
    F --> H
    
    M[Path-based Fallback] --> N[/companySlug]
    N --> J
    O[/companySlug/streamSlug] --> L
    
    style G fill:#e1f5fe
    style J fill:#e8f5e8
    style L fill:#fff3e0
```

## Routing Mapping

### Subdomain Routing (Primary)
| URL | Company Slug | Stream Slug |
|-----|-------------|-------------|
| `acme.domain.com` | `acme` | - |
| `acme.domain.com/sermon` | `acme` | `sermon` |
| `acme.domain.com/live-praise` | `acme` | `live-praise` |

### Path-based Routing (Fallback)
| URL | Company Slug | Stream Slug |
|-----|-------------|-------------|
| `domain.com/acme` | `acme` | - |
| `domain.com/acme/sermon` | `acme` | `sermon` |
| `domain.com/acme/live-praise` | `acme` | `live-praise` |

### Special Routes (Apex/WWW)
| URL | Behavior |
|-----|----------|
| `domain.com` | Landing page with company search/directory |
| `www.domain.com` | Redirect to landing page |
| `api.domain.com` | API requests (unchanged) |

## Implementation Steps

### Step 1: Environment Configuration

Add environment variables for domain configuration:

```env
# Base domain for the application
NEXT_PUBLIC_BASE_DOMAIN=volantislive.com

# Include subdomain in production (set to true in production)
NEXT_PUBLIC_USE_SUBDOMAINS=true
```

### Step 2: Update Next.js Configuration

Modify `next.config.ts` to handle wildcard subdomain routing:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Support wildcard subdomains
  async rewrites() {
    return [
      // API requests - bypass rewrite
      {
        source: '/api/:path*',
        destination: 'https://api-dev.volantislive.com/:path*',
      },
    ];
  },
  
  // Handle subdomains in domains array
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.volantislive.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.volantislive.com',
      },
    ],
  },
};

export default nextConfig;
```

### Step 3: Create Subdomain Detection Utilities

Create `src/lib/subdomain.ts` for parsing and validating subdomains:

```typescript
// Key utilities needed:
// 1. parseSubdomain(host: string) -> string | null
// 2. isValidCompanySlug(slug: string) -> boolean  
// 3. getBaseDomain() -> string
// 4. buildSubdomainUrl(companySlug: string, path?: string) -> string
// 5. buildPathUrl(companySlug: string, path?: string) -> string
```

### Step 4: Create Middleware

Create `src/middleware.ts` for routing requests:

```typescript
// Middleware should:
// 1. Parse the host from request
// 2. Detect if it's a subdomain (not www, not apex)
// 3. Rewrite subdomain requests to path-based internally
// 4. Handle special routes (www, api, static assets)
```

### Step 5: Update Root Layout

Modify `src/app/layout.tsx` to:

```typescript
// 1. Check for company subdomain in headers
// 2. Conditionally render Navbar/Layout based on subdomain
// 3. Generate dynamic metadata based on company context
// 4. Support both subdomain and path-based modes
```

### Step 6: Update Company Page Layout

Modify `src/app/[companySlug]/layout.tsx`:

```typescript
// 1. Accept companySlug from params OR headers
// 2. Maintain backward compatibility with path-based routing
// 3. Update metadata generation for subdomain URLs
// 4. Validate company exists for both routing modes
```

### Step 7: Update Stream Page Layout

Modify `src/app/[companySlug]/[streamSlug]/layout.tsx`:

```typescript
// 1. Similar changes as company page layout
// 2. Update share URLs to work with subdomains
// 3. Update OpenGraph URLs for subdomain canonical links
```

### Step 8: Update API Client

Modify `src/lib/api/client.ts`:

```typescript
// 1. Add helper to construct URLs based on subdomain mode
// 2. Ensure API calls work consistently regardless of routing
// 3. Update any hardcoded URLs to use environment config
```

### Step 9: Update Navigation Components

Modify `src/components/layout/navbar.tsx` and other navigation:

```typescript
// 1. Update internal links to use appropriate routing mode
// 2. Add subdomain toggle for testing
// 3. Handle company-specific branding for subdomain pages
```

### Step 10: Update Page Components

Modify key pages to handle both routing modes:

- `src/app/[companySlug]/page.tsx` - Company landing page
- `src/app/[companySlug]/[streamSlug]/page.tsx` - Stream player page

## Files to Modify

### New Files to Create
1. `src/lib/subdomain.ts` - Subdomain utilities
2. `src/middleware.ts` - Request routing middleware

### Files to Modify
1. `next.config.ts` - Domain and rewrite configuration
2. `src/app/layout.tsx` - Root layout with subdomain detection
3. `src/app/[companySlug]/layout.tsx` - Company page layout
4. `src/app/[companySlug]/[streamSlug]/layout.tsx` - Stream page layout
5. `src/lib/api/client.ts` - API client with URL helpers
6. `src/components/layout/navbar.tsx` - Navigation with dynamic links

## Testing Checklist

- [ ] `company.domain.com` loads company page
- [ ] `company.domain.com/stream-slug` loads stream page
- [ ] `domain.com/company` (path-based) still works
- [ ] `domain.com/company/stream-slug` (path-based) still works
- [ ] `domain.com` shows landing page
- [ ] `www.domain.com` redirects to landing page
- [ ] Invalid company subdomain shows 404
- [ ] API calls work with both routing modes
- [ ] Share functionality works with subdomains
- [ ] SEO metadata correct for both modes

## Rollout Strategy

1. **Development**: Test locally with hosts file or `.localhost` subdomains
2. **Staging**: Deploy to Vercel preview with custom domains
3. **Production**: 
   - Enable subdomains in DNS (wildcard CNAME)
   - Update environment variables
   - Monitor for issues
   - Keep path-based as fallback

## Environment Configuration

```env
# Development
NEXT_PUBLIC_BASE_DOMAIN=localhost:3000
NEXT_PUBLIC_USE_SUBDOMAINS=false

# Staging  
NEXT_PUBLIC_BASE_DOMAIN=staging.volantislive.com
NEXT_PUBLIC_USE_SUBDOMAINS=true

# Production
NEXT_PUBLIC_BASE_DOMAIN=volantislive.com
NEXT_PUBLIC_USE_SUBDOMAINS=true
```

## DNS Configuration (Production)

Add wildcard CNAME record:
```
*.volantislive.com -> cname.vercel-dns.com.
```

## Vercel Configuration

In `vercel.json` or project settings:
- Add custom domain: `volantislive.com`
- Add wildcard domain: `*.volantislive.com`
- Ensure both resolve to the same deployment