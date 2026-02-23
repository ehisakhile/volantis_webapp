# VOLANTISLIVE — NEXT.JS WEBSITE SYSTEM SKILL FILE
> Internal AI Agent Playbook: Full-Stack Marketing & Product Website
> Stack: Next.js 16.0.7· TypeScript · Tailwind CSS · Framer Motion
> Brand: Volantislive — Live Audio Streaming, Built for Africa

---

## AGENT PRE-FLIGHT CHECKLIST

Before writing a single line of code, the agent must:

1. Read **Section 1** (Product Understanding) fully
2. Identify which page is being built
3. Read the corresponding section for that page
4. Check **Section 17** (Anti-Patterns) — mandatory
5. Run the **Section 18** Execution Sequence

Never skip these steps. They prevent architecture drift.

---

# SECTION 1 — PRODUCT UNDERSTANDING INTELLIGENCE

## 1.1 Why Audio-First Wins in Africa

Video streaming consumes 2–10x more bandwidth than audio. In Nigeria and across sub-Saharan Africa, the average mobile data plan costs significantly more relative to income than in Western markets. A 1GB plan that might last a week in the UK could be consumed in hours by video streaming.

Audio-first streaming is not a compromise — it is the correct technical decision for this market. A church in Lagos broadcasting a 2-hour Sunday service via audio will use roughly 50–90MB at low bitrates. The same service via video would consume 500MB–2GB. This difference determines whether someone can afford to listen at all.

Volantislive is not "Twitch for audio." It is infrastructure-as-ministry.

## 1.2 Connectivity Economics — Nigeria Context

The agent must internalize these realities to write authentic copy and design appropriate UX:

- **2G/EDGE is still common** in rural and semi-urban zones. Many users on 3G see real-world speeds of 0.3–1 Mbps.
- **Network instability** means a connection drops and reconnects frequently. Streams must auto-reconnect without the listener noticing.
- **Data is prepaid** in Nigeria. Users are acutely aware of how much data anything consumes. Cost-per-minute-of-listening is a real user concern.
- **Mobile-first is the only first.** Desktop internet penetration is low. Smartphones are the primary (often only) computing device.
- **Wifi is unreliable** even in urban churches — power cuts during services are common. Hybrid 4G/Wifi failover is a real need.
- **Load-shedding** (power cuts) affects broadcasters too. Battery-powered broadcasting scenarios are real.

## 1.3 Church Adoption Psychology

Churches in Nigeria are among the most technologically active institutions in the country. Yet SaaS adoption follows a specific pattern the agent must understand:

**Decision Hierarchy in a Nigerian Church:**
1. Senior Pastor / General Overseer — must bless the decision
2. Media/Tech Director — evaluates and recommends
3. Finance Officer / Church Deacon — approves cost
4. Sometimes a committee of elders or deacons

This means the website must speak to at least three different personas:
- **The Media Director** (technical: Does this work? Is setup easy?)
- **The Pastor** (purpose: Does this serve the ministry?)
- **The Finance Officer** (value: Is this affordable and trustworthy?)

Conversion is rarely immediate. Churches will read, leave, return, compare, ask questions, and then slowly commit. The website must serve returning visitors with additional trust layers (testimonials, track record, uptime claims).

## 1.4 Trust Barriers in Nigerian SaaS Adoption

Nigerian consumers have been burned by unreliable online services, failed startups, and poor support. Trust must be earned through:

- **Uptime promises with specifics** ("99.5% uptime SLA" beats "reliable")
- **Nigerian business presence** (local phone number, Nigerian address if possible)
- **Testimonials from recognizable institutions** (well-known churches, named pastors)
- **Transparent pricing in Naira** (USD pricing alone signals "not for us")
- **Support accessibility** (WhatsApp support is far more trusted than email ticketing)
- **Free trial without credit card** (card penetration is lower; it removes barriers)
- **Plain English** — no corporate jargon. "Start your broadcast" not "Initiate your stream workflow"

---

# SECTION 2 — INFORMATION ARCHITECTURE SKILLS

## 2.1 Site Hierarchy

```
volantislive.com/
├── (homepage)                         # Primary conversion page
├── features/                          # Features hub (overview)
│   ├── live-streaming/                # Feature: Live broadcast engine
│   ├── channel-pages/                 # Feature: Listener landing pages
│   ├── replay-archive/                # Feature: On-demand replay
│   ├── listener-chat/                 # Feature: Audience interaction
│   ├── analytics/                     # Feature: Stream analytics
│   ├── scheduling/                    # Feature: Broadcast scheduling
│   ├── private-streams/               # Feature: Password-protected streams
│   ├── embeddable-player/             # Feature: Website embed
│   ├── stream-links/                  # Feature: Shareable stream URLs
│   └── low-data-mode/                 # Feature: Bandwidth optimization (KEY DIFFERENTIATOR)
├── solutions/                         # Use case hub
│   ├── churches/                      # Solution: Churches (primary)
│   ├── ministries/                    # Solution: Ministries & outreach
│   ├── community-radio/               # Solution: Radio stations
│   ├── events/                        # Solution: Live events
│   └── creators/                      # Solution: Independent creators
├── pricing/                           # Pricing page
├── how-it-works/                      # Onboarding flow explainer
├── blog/                              # SEO content engine
│   └── [slug]/                        # Individual blog posts
├── help/                              # Help center root
│   ├── getting-started/               # Onboarding category
│   ├── broadcasting/                  # Broadcasting guides
│   ├── listeners/                     # Listener guides
│   ├── billing/                       # Billing & plans
│   └── troubleshooting/               # Common issues
├── about/                             # Company story
├── contact/                           # Contact page
├── login/                             # Auth entry point
└── signup/                            # Registration entry point
```

## 2.2 URL Philosophy

URLs must be:
- **Human-readable** and intent-clear (`/solutions/churches` not `/sol/ch`)
- **SEO-loaded** where appropriate (`/blog/how-to-stream-church-service-nigeria`)
- **Stable** — do not change URLs after launch (redirects erode trust and SEO)
- **Lowercase with hyphens** — never underscores, never camelCase

The URL should answer: "What will I find here?" before clicking.

## 2.3 Navigation Mental Models

Users arrive with one of three mental models:

| Mental Model | Entry Intent | Best Path |
|---|---|---|
| "I'm a church, can this work for us?" | Solution-seeking | Homepage → /solutions/churches → Pricing |
| "What does it do?" | Feature-browsing | Homepage → /features → Specific feature → Pricing |
| "How much does it cost?" | Price-checking | Homepage → /pricing → Back to features for validation |

The navigation must serve all three simultaneously without forcing a linear path.

## 2.4 Page Relationships Map

Every page must know its neighbors:

```
Homepage ←→ All solutions pages (bilateral links)
Homepage ←→ Pricing (bidirectional)
Each Feature page → Relevant Solution page → Pricing
Each Solution page → Relevant Feature pages + How It Works + Pricing
Pricing → How It Works → Signup
Blog posts → Relevant solution or feature pages (contextual CTAs)
Help Center → Pricing (upsell from free tier limits)
About → Contact (natural flow)
```

## 2.5 Discoverability Logic

- Every page must have **1 primary CTA** and **1 secondary CTA**
- No page should be more than **3 clicks from signup**
- The **Help Center** must be discoverable from the main nav (not buried in footer only)
- **Pricing** must be visible in the main nav — hiding it creates distrust

---

# SECTION 3 — FULL WEBSITE CONVERSION SYSTEM

## 3.1 Awareness → Trust → Activation Journey

```
AWARENESS LAYER
├── Blog posts (SEO) — "How to live stream a church service in Nigeria"
├── Social proof on homepage — named churches using the platform
└── Solutions pages — "This is built for you specifically"
        ↓
EDUCATION LAYER
├── How It Works page — reduces uncertainty
├── Feature pages — "Here's exactly what you get"
├── Demo/preview — see it before buying
└── FAQ sections — removes objections
        ↓
TRUST LAYER
├── Testimonials with photos, names, church names
├── Uptime statistics
├── Nigerian pricing in Naira
├── Free trial / free plan offer
└── WhatsApp support signal
        ↓
ACTIVATION LAYER
├── Signup CTA (primary)
├── Free trial CTA (lower friction)
└── "Talk to us" CTA (for large/enterprise churches)
```

## 3.2 Multi-Page Funnel Flows

**Church Discovery Funnel:**
```
Google: "how to live stream church nigeria"
→ Blog post: "Complete guide to church live streaming in Nigeria"
→ Internal link to /solutions/churches
→ Feature callouts + testimonials
→ Pricing section teaser → /pricing
→ Signup
```

**Direct Intent Funnel:**
```
Google: "volantislive pricing"
→ /pricing
→ Compare plans
→ "How is this different?" → /features/low-data-mode
→ Signup
```

## 3.3 Returning Visitor Psychology

Return visits signal high intent. On return visits, the site should (conceptually):
- Show the same trustworthy, consistent experience (don't flash-sale spam)
- Have updated social proof visible (testimonials, listener counts)
- Make "Start Free Trial" immediately accessible without scrolling
- Offer a "Chat with us" option that appears on second+ visit

---

# SECTION 4 — HOMEPAGE STRATEGY SKILLS

## 4.1 Hero Section Logic

The hero must answer 4 questions in under 5 seconds:
1. **What is this?** ("Live audio streaming for churches and creators")
2. **Who is it for?** ("Built for Africa — works on any connection")
3. **Why should I care?** ("Never lose a listener, even on weak networks")
4. **What do I do next?** (Single, prominent CTA)

**Hero headline formula:**
`[Outcome] + [For Who] + [Key Differentiator]`

Example: "Stream Your Church Service Live — Even on a Poor Connection"

**Hero sub-headline:** One sentence that expands on the promise and names the real problem.
Example: "Volantislive uses ultra-low bandwidth audio streaming so your congregation never misses a message, no matter their network."

**Hero CTA:** "Start Streaming Free" (primary) + "See How It Works" (secondary)

**Hero visual:** Not a screenshot of a dashboard. Show the *outcome*: a congregation listening, a broadcaster smiling, a phone showing "Live" status. Emotion over interface.

## 4.2 Problem Framing Section

Immediately below the hero, surface the pain before presenting the solution.

Structure:
```
"Does this sound familiar?"
[3 pain points in conversational language]
→ "That's why we built Volantislive"
```

Pain points to name:
- "Your stream cuts out the moment you go live on Sunday"
- "Your listeners are on expensive mobile data — every megabyte counts"
- "Other streaming tools require downloads, technical setup, or fast internet"

This section creates a "they understand me" moment essential for African tech adoption.

## 4.3 Social Proof Placement

Social proof appears in 3 layers on the homepage:
1. **Above the fold** — small trust badge: "Trusted by 500+ churches across Nigeria"
2. **Mid-page** — logos or names of notable churches (with permission)
3. **Late page** — full testimonials with photo, name, church, and city

Rule: Named testimonials with real church names outperform anonymous quotes by 10x in this market.

## 4.4 Feature Previews on Homepage

Do not list features. Preview transformations:

| ❌ Feature-first | ✅ Transformation-first |
|---|---|
| "Low bitrate streaming" | "Your listeners use less than 1MB per minute" |
| "Auto-reconnect" | "Dropped connections restart in seconds — listeners never notice" |
| "Embeddable player" | "Add a 'Listen Live' button to your church website in 2 minutes" |

Show 3–4 feature previews maximum. Each links to the full feature page.

## 4.5 Homepage Conversion Triggers

**Primary CTA block (appears 3x on homepage):**
- Above fold (hero)
- After social proof section
- Footer of homepage content

**Trust signals near CTA:**
- "No credit card required"
- "Free plan available"
- "Setup takes 5 minutes"
- "Cancel anytime"

These are not marketing fluff — in this market, they are trust-critical information.

---

# SECTION 5 — FEATURE PAGE FRAMEWORK SKILLS

## 5.1 Feature Page Structure

Every feature page follows this architecture:

```
1. HERO — Transformation headline + 1 sentence problem
2. THE PROBLEM — What breaks without this feature
3. THE SOLUTION — How this feature solves it (plain language)
4. HOW IT WORKS — 3-step visual walkthrough
5. KEY BENEFITS — 3–4 benefit statements (outcome-focused)
6. RELEVANT USE CASE — "Perfect for churches that…"
7. RELATED FEATURES — 2–3 cross-links
8. CTA BLOCK — "Start using [Feature] free"
```

## 5.2 Transformation Storytelling Model

Every feature must be framed as a story:
- **Before state** (the problem, the frustration)
- **The turning point** (the feature activates)
- **After state** (the outcome, the relief)

Example for "Low Data Mode" feature:

> **Before:** Pastor Emeka's Sunday sermon reaches 200 in the building. But 500 congregation members watching online keep getting disconnected — their data runs out mid-sermon.
>
> **The Feature:** Volantislive's Low Data Mode streams at 32kbps — that's less than 2MB per minute. Clear audio, minimum data.
>
> **After:** His full 2-hour service uses under 200MB. His listeners stay connected from the first hymn to the final blessing.

## 5.3 Feature Headline Rules

Never use technical language as a headline.

| Feature | ❌ Wrong Headline | ✅ Right Headline |
|---|---|---|
| Low bitrate streaming | "32kbps audio streaming" | "Your listeners use less data than a WhatsApp call" |
| Auto-reconnect | "Stream reconnection logic" | "Dropped connections fix themselves in seconds" |
| Web-based broadcaster | "Browser-based WebRTC streaming" | "Go live from any browser — no downloads, no installs" |
| Analytics | "Real-time stream analytics" | "See exactly who's listening and when" |
| Embeddable player | "Embeddable audio widget" | "Add 'Listen Live' to your website in 2 minutes" |
| Replay archive | "Stream recording storage" | "Every broadcast saved automatically — replay anytime" |
| Scheduling | "Broadcast scheduling tool" | "Schedule your streams — your audience knows exactly when to tune in" |
| Private streams | "Password-protected streams" | "Stream privately to your inner circle only" |
| Listener chat | "Real-time chat module" | "Your listeners can pray, react, and interact — live" |
| Channel pages | "Broadcaster profile page" | "Your own streaming page — share one link with everyone" |

---

# SECTION 6 — SOLUTIONS PAGE SKILLS

## 6.1 Solutions Page Structure (Universal)

```
1. HERO — "Volantislive for [Audience]" + audience-specific headline
2. AUDIENCE RECOGNITION — "We know what you're dealing with…" (pain points)
3. HOW IT HELPS — Feature callouts specific to this audience
4. WORKFLOW — How a typical [audience member] uses the platform
5. TESTIMONIALS — From this audience specifically
6. FEATURE CHECKLIST — "Everything you need" — relevant features listed
7. PRICING CALLOUT — "Plans starting at ₦X/month"
8. CTA — Audience-specific: "Start Your Church Stream Free"
```

## 6.2 Audience-Specific Messaging

### Churches (`/solutions/churches`)
**Primary pain:** Streaming tools don't work on church Wi-Fi. Members on data get cut off.
**Primary promise:** "Never lose a congregant to a dropped connection again."
**Key features to highlight:** Low Data Mode, Embeddable Player, Replay Archive, Scheduling
**Tone:** Reverent, mission-aligned, practical
**CTA:** "Start Streaming Your Services Free"

**Unique section:** "Why churches choose Volantislive"
- Works on DSTV-grade connections
- Setup before Sunday takes 10 minutes
- Congregation listens from anywhere — phone, laptop, tablet
- Replay lets members who missed service catch up
- No ads on your stream

### Ministries (`/solutions/ministries`)
**Primary pain:** Reaching members spread across cities, states, or countries.
**Primary promise:** "Your message reaches every member — wherever they are in Nigeria and beyond."
**Key features:** Stream Links, Private Streams, Analytics, Replay Archive
**Tone:** Evangelistic energy, expansive vision
**CTA:** "Broadcast Your Ministry Nationwide"

### Community Radio (`/solutions/community-radio`)
**Primary pain:** FM transmitters are expensive, licensed, and geographically limited.
**Primary promise:** "Broadcast your community station online — no transmitter, no license fees, no signal limits."
**Key features:** Scheduling, 24/7 streaming, Analytics, Embeddable Player
**Tone:** Empowering, grassroots, activist
**CTA:** "Launch Your Online Radio Station"

### Events (`/solutions/events`)
**Primary pain:** Event streams fail at peak moments; participants can't all attend physically.
**Primary promise:** "Your event audience is everywhere — let them all be there live."
**Key features:** Scheduling, Listener Chat, Replay Archive, Stream Links
**Tone:** Energetic, professional
**CTA:** "Stream Your Next Event Free"

### Creators (`/solutions/creators`)
**Primary pain:** Podcast platforms require pre-recorded content; YouTube needs video; Facebook is unreliable.
**Primary promise:** "Go live whenever inspiration strikes — no camera, no studio, just your voice."
**Key features:** Channel Pages, Listener Chat, Analytics, Replay Archive
**Tone:** Creative, empowering, peer
**CTA:** "Start Your Live Show Today"

---

# SECTION 7 — PRICING PSYCHOLOGY (AFRICA EDITION)

## 7.1 Currency Sensitivity

- **Always show prices in Nigerian Naira (₦) first**
- USD pricing may appear as secondary, smaller text: "(≈ $X USD)"
- Do not assume the viewer knows exchange rates
- Update Naira pricing if exchange rate moves significantly
- Offer annual pricing to reduce per-transaction friction (Naira devaluation concern)

## 7.2 Plan Architecture

Structure 3 plans maximum. More than 3 causes decision paralysis.

```
FREE PLAN — "Starter"
└── Limited monthly broadcast hours
└── Basic analytics
└── Volantislive subdomain (youraccount.volantislive.com)
└── 50 concurrent listeners
└── No credit card required
└── CTA: "Start Free"

GROWTH PLAN — "Church" (₦X,XXX/month)
└── Unlimited broadcast hours
└── Full analytics
└── Custom channel page
└── 500 concurrent listeners
└── Replay archive (30 days)
└── Embeddable player
└── Email support
└── CTA: "Start Free Trial"
└── Badge: "Most Popular"

PROFESSIONAL PLAN — "Ministry" (₦XX,XXX/month)
└── Everything in Church
└── 2,000+ concurrent listeners
└── Private streams
└── Priority support (WhatsApp)
└── 90-day replay archive
└── Remove Volantislive branding
└── Custom stream domain
└── CTA: "Contact Us for Setup"
```

## 7.3 Church Committee Decision Behavior

Church finance decisions often happen in committee. The pricing page must account for this:

- Include a **PDF download** of plan comparison ("Download for your team")
- Include a **"Talk to Us" option** for institutional accounts
- State: "We offer special rates for registered ministries — ask us"
- Allow a **60-day free trial** for the Growth plan (longer than SaaS norms — matches church decision cycle)

## 7.4 Monthly vs Annual Psychology

- Annual plan must save at least 2 months (≈ 17% discount)
- Frame as: "Pay for 10 months, stream for 12"
- For churches: annual billing matches church budget cycles (usually annual)
- Always show annual as the **default toggle state** — monthly as opt-in

## 7.5 Trust Pricing Signals

Near every pricing plan CTA:
- "Cancel anytime — no lock-in"
- "No setup fees"
- "Prices fixed for 12 months — no surprise increases"
- "Used by [X] churches in Nigeria"
- Support channel visible on pricing page (WhatsApp number)

---

# SECTION 8 — NAVIGATION & LINKING INTELLIGENCE

## 8.1 Primary Navigation Structure

```
[Logo]  Features ▾  Solutions ▾  Pricing  How It Works  Blog  [Login]  [Start Free →]
```

Rules:
- "Start Free" button always visible in nav — right-aligned, sky blue
- "Pricing" is a direct link — not hidden in a dropdown
- Login is low-emphasis (text link, not button)
- On mobile: hamburger menu, "Start Free" remains visible

## 8.2 Mega Menu — Features Dropdown

```
FEATURES
─────────────────────────────────────────
FOR BROADCASTERS          FOR LISTENERS
Live Streaming            Replay Archive
Channel Pages             Listener Chat
Broadcast Scheduling      Stream Links
Private Streams           
Low Data Mode  ← HIGHLIGHT WITH BADGE: "Africa's First"

[→ See All Features]
```

## 8.3 Mega Menu — Solutions Dropdown

```
SOLUTIONS
─────────────────────────────────────────
Churches                  Community Radio
Ministries               Events
                          Creators

[→ Find Your Solution]
```

## 8.4 Progressive Disclosure

Not every feature needs to be in the nav. The nav surfaces top-level categories. Within each page, features are disclosed progressively:
- Homepage: 4 feature previews → "See all features"
- Features Hub: All features listed with 1-line descriptions
- Individual Feature page: Full detail

## 8.5 Cross-Page Linking Rules

Every page must have:
- **1 "upstream" link** (toward a hub or homepage)
- **1–3 "lateral" links** (to related pages at same level)
- **1 "downstream" link** (toward pricing or signup)

Example — `/features/low-data-mode`:
- Upstream: `/features/` (Features Hub)
- Lateral: `/features/embeddable-player`, `/solutions/churches`
- Downstream: `/pricing`

## 8.6 Feature → Solution → Pricing Loops

The site must feel like a connected system, not isolated pages. Build these explicit loops in every page:

- Feature page CTA: "See how churches use this →" (→ solution page)
- Solution page CTA: "View plans →" (→ pricing)
- Pricing page FAQ: "What features are included?" links back to feature pages

---

# SECTION 9 — SEARCH & DISCOVERABILITY SKILLS

## 9.1 Internal Search

The Help Center must have a search bar. Implement with:
- Client-side fuzzy search (Fuse.js) over help article titles and summaries
- Search results surface article title + category + estimated read time
- Empty state: "Can't find it? Chat with us on WhatsApp" (with link)

Blog search: Optional on blog index. Not required on launch.

## 9.2 Help Center Discoverability

Hierarchy for help articles:
```
help/
├── getting-started/
│   ├── how-to-create-your-account
│   ├── setting-up-your-channel-page
│   └── going-live-for-the-first-time
├── broadcasting/
│   ├── what-is-low-data-mode
│   ├── how-to-schedule-a-stream
│   └── using-the-embeddable-player
├── listeners/
│   ├── how-to-listen-on-mobile
│   └── replay-and-archive
├── billing/
│   ├── pricing-and-plans
│   └── how-to-upgrade
└── troubleshooting/
    ├── stream-keeps-disconnecting
    ├── poor-audio-quality
    └── listeners-cant-connect
```

## 9.3 SEO Clustering Strategy

Build topic clusters around high-value keywords:

**Cluster 1: Church Streaming Nigeria**
- Pillar: "How to Live Stream Your Church Service in Nigeria"
- Spokes: "Best church streaming apps Nigeria", "How to stream Sunday service WhatsApp", "Low data church live stream"

**Cluster 2: Live Audio Streaming Africa**
- Pillar: "Live Audio Streaming Platforms for Africa"
- Spokes: "Audio streaming vs video streaming Africa data", "Streaming on 3G Nigeria"

**Cluster 3: Online Radio Nigeria**
- Pillar: "How to Start an Online Radio Station in Nigeria"
- Spokes: "Free online radio Nigeria", "Internet radio broadcasting Africa"

## 9.4 Keyword Intent Mapping

| Keyword | Intent | Best Page to Target |
|---|---|---|
| "church live streaming Nigeria" | Transactional | /solutions/churches |
| "how to stream church service" | Informational | /blog/how-to-stream-church-service-nigeria |
| "live audio streaming platform Africa" | Transactional | Homepage |
| "low data live streaming" | Informational | /features/low-data-mode |
| "Mixlr alternative Nigeria" | Transactional | Homepage or comparison blog post |
| "free church streaming tool" | Transactional | /pricing |
| "online radio station Nigeria" | Transactional | /solutions/community-radio |
| "stream live without wifi" | Informational | Blog / /features/low-data-mode |

---

# SECTION 10 — UX WRITING SKILLS

## 10.1 Tone of Voice

**Brand voice:** Warm expert. Like a knowledgeable friend who works in tech and goes to church.

NOT:
- Corporate ("Leverage our enterprise-grade streaming infrastructure")
- Overly casual ("OMG go live in secs!!!")
- Preachy ("We believe technology should serve humanity")

YES:
- Direct ("Go live in 5 minutes — from any browser")
- Specific ("Uses less data than a WhatsApp voice message")
- Respectful ("Your ministry deserves tools that actually work")

## 10.2 CTA Philosophy

| Context | CTA Copy |
|---|---|
| Hero | "Start Streaming Free" |
| After feature explanation | "Try [Feature] Free" |
| After testimonial | "Join [X] Churches Already Streaming" |
| Pricing page | "Start Free Trial" / "Get Started" |
| Blog post | "See How Volantislive Works →" |
| Help center | "Back to Help Center" / "Still need help? Chat with us" |
| Footer | "Start Your Free Account" |

Rules:
- CTAs are action verbs ("Start", "Try", "Join", "See") — never nouns ("Free Trial")
- Avoid "Submit" on any form — use "Create My Account", "Start Streaming", etc.
- Never use "Click here" — describe the destination

## 10.3 Microcopy

**Form labels:** Descriptive, not just field names
- `Email address` → "Your email (we'll send your login here)"
- `Password` → "Create a password (min. 8 characters)"

**Error messages:**
- Specific: "That email is already registered. [Log in instead →]"
- NOT generic: "An error occurred. Please try again."

**Empty states:**
- No streams yet: "You haven't streamed yet. [Go Live Now →]"
- No listeners: "Nobody's tuned in yet — share your stream link to invite listeners"

**Loading states:**
- "Connecting to your stream…"
- "Saving your settings…" (not "Loading…")

## 10.4 Simplicity Bias Rules

- If a sentence needs re-reading, rewrite it
- Max sentence length: 20 words for UI copy
- Max paragraph length on marketing pages: 3 sentences
- Never use: "leverage", "utilize", "seamlessly", "robust", "cutting-edge", "innovative"
- Always use: "use", "works", "easy", "fast", "simple", "reliable"
- Numbers beat adjectives: "Under 2MB per minute" beats "extremely low data usage"

---

# SECTION 11 — VISUAL SYSTEM SKILLS (NEXT.JS / TAILWIND)

## 11.1 Color System

```typescript
// tailwind.config.ts
const colors = {
  // Primary — Sky Blue
  brand: {
    50:  '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // PRIMARY ACTION COLOR
    600: '#0284c7',  // Hover state
    700: '#0369a1',  // Active / pressed
    800: '#075985',
    900: '#0c4a6e',
  },
  // Neutral
  neutral: {
    50:  '#f8fafc',  // Page backgrounds
    100: '#f1f5f9',  // Card backgrounds
    200: '#e2e8f0',  // Borders
    400: '#94a3b8',  // Placeholder text
    600: '#475569',  // Body text
    800: '#1e293b',  // Headings
    900: '#0f172a',  // Dark backgrounds
  },
  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error:   '#ef4444',
  live:    '#ef4444',  // Red dot for "LIVE" indicator
}
```

## 11.2 Sky Blue Usage Hierarchy

1. **Primary CTAs** — buttons, action links (`brand.500`)
2. **Active states** — current nav item, selected plan (`brand.600`)
3. **Accent elements** — feature icons, highlight borders (`brand.400`)
4. **Background washes** — section backgrounds, card highlights (`brand.50`, `brand.100`)
5. **Never for body text** — blue text reduces readability; use `neutral.600`

## 11.3 Typography Stack

```css
/* Primary heading font — suggest: Plus Jakarta Sans or Sora (Google Fonts) */
--font-heading: 'Plus Jakarta Sans', sans-serif;

/* Body font — suggest: DM Sans or Inter (exception: DM Sans is more warm) */
--font-body: 'DM Sans', sans-serif;

/* Mono — for code/technical elements */
--font-mono: 'JetBrains Mono', monospace;
```

Scale (Tailwind):
- `text-5xl font-bold` — Hero headlines
- `text-3xl font-semibold` — Section headlines
- `text-xl font-medium` — Sub-headlines
- `text-base` — Body copy (16px)
- `text-sm` — Captions, labels, metadata
- `text-xs` — Legal, fine print

## 11.4 Trust-Building UI Patterns

- **Live indicators:** Pulsing red dot next to "LIVE" — universally understood
- **Uptime badge:** Small badge on homepage: "99.5% uptime" with green dot
- **Listener count:** "1,247 listening now" creates social proof dynamically
- **Testimonial cards:** Photo + name + church name + city + quote — no anonymous quotes
- **Security signal:** Small lock icon near pricing: "Secure payment via Paystack"

## 11.5 Low-Bandwidth-Friendly UI

The website itself must practice what it preaches:
- **No autoplay video** anywhere on the site — ever
- **Images:** WebP format, lazy loaded, `next/image` with proper `sizes`
- **Fonts:** Limit to 2 font families, subset to Latin + extended Latin
- **Animations:** CSS-based preferred over JS; Framer Motion only where truly valuable
- **Above-the-fold:** Must render in <2s on a 3G connection (aim for <500KB initial load)
- **No heavy hero videos** — use static images with CSS animation if movement needed

## 11.6 Mobile-First Layout Reasoning

All layouts designed mobile-first, then expanded:
- Single column on mobile
- Two columns on tablet (`md:grid-cols-2`)
- Three columns on desktop (`lg:grid-cols-3`)

Minimum touch targets: 44×44px for all interactive elements.

Nav collapses to hamburger on mobile. "Start Free" button remains visible in mobile nav header.

---

# SECTION 12 — TRUST & CREDIBILITY SYSTEMS

## 12.1 Testimonial System

**Requirements for a valid testimonial:**
- Full name (not initials)
- Church/organization name
- City and state
- Role (e.g., "Media Director, Victory Assembly, Lagos")
- Photo (professional or natural — not stock)
- Specific outcome ("We went from 50 online listeners to 800 in 3 months")

Display formats:
- Homepage: 3 featured testimonials in cards
- Solution pages: 1–2 testimonials from same audience type
- Pricing: 1 testimonial near highest-value plan

## 12.2 Reliability Messaging

On the homepage and solutions pages, include an infrastructure reassurance block:

```
"Built for Nigeria's Network Reality"
✓ Auto-reconnect in under 3 seconds
✓ 32kbps minimum — works on 2G
✓ Servers with Nigerian CDN nodes
✓ 99.5% uptime SLA
✓ Stream survives broadcaster network drops
```

This is not feature marketing — it is trust infrastructure.

## 12.3 Social Proof Loops

A social proof loop requires:
1. **Proof on homepage** → builds initial interest
2. **Proof on solution page** → audience-matched, deepens trust
3. **Proof on pricing page** → removes final hesitation
4. **Proof in emails / onboarding** → confirms good decision post-signup

The same testimonial should not appear in all 4 places. Rotate content across the loop.

## 12.4 Support Visibility as Trust Signal

Display support options visibly — not buried in footer:
- On pricing page: "Questions? Chat with us on WhatsApp: +234 XXX XXX XXXX"
- On signup page: "Need help? Message us on WhatsApp"
- Help center header: WhatsApp + Email prominently displayed

WhatsApp support is not just convenient in Nigeria — it is a trust signal that says "real people are here."

---

# SECTION 13 — FEATURE ECOSYSTEM MAPPING

## 13.1 Live Broadcast

**What it does:** The broadcaster goes live from any browser — no install required. Works on Chrome, Firefox, Safari. Mobile browser support.

**How to market it:**
- Lead with "no download" (removes the biggest friction for non-technical users)
- Show 3-step setup: Create account → Name your stream → Click "Go Live"
- Emphasize mobile broadcasting: "Go live from your phone during a road trip service"
- Technical confidence builder: "Uses the same technology as professional radio studios — simplified"

**Key metrics to show:** Time-to-first-stream ("Average user goes live in under 8 minutes")

## 13.2 Channel Pages

**What it does:** Every broadcaster gets a personal channel page at `volantislive.com/[username]`. This is their public identity — listeners bookmark it and come back.

**How to market it:**
- "Your one link for everything" — share it on WhatsApp, Instagram bio, church bulletins
- Show what a completed channel page looks like (screenshot with custom logo, schedule, recent replays)
- Frame as professional identity: "Look like a professional broadcaster from day one"

## 13.3 Replay Archive

**What it does:** Every broadcast is automatically recorded and stored. Listeners can play back any past stream.

**How to market it:**
- For churches: "Members who missed Sunday can catch the full service on Monday"
- For ministries: "Your messages live forever — not just the moment you broadcast"
- Show the archive grid: thumbnails, dates, listener counts
- SEO angle: archived sermons can be listed on Google

## 13.4 Listener Chat

**What it does:** Listeners can send text messages during a live stream. Broadcaster can see and respond.

**How to market it:**
- "Your congregation can say 'Amen' in real-time" — African church culture resonance
- Prayer request flow: "Listeners submit prayer requests during the broadcast"
- Frame as community-building, not just a chat box
- Show moderation tools (broadcaster can remove messages)

## 13.5 Analytics

**What it does:** Post-stream and real-time analytics: listener count, peak listeners, geographic breakdown, device breakdown, average listen time.

**How to market it:**
- "Understand your real audience — not just your building attendance"
- Church use case: "See how many people from outside Lagos are tuning in"
- Growth framing: "Track your monthly listener growth as your ministry expands"
- Keep it simple in marketing — don't overwhelm with chart previews. One compelling number is better than a full dashboard screenshot.

## 13.6 Scheduling

**What it does:** Broadcaster can schedule upcoming streams with a date, time, and description. Listeners see upcoming streams on the channel page.

**How to market it:**
- "Your listeners know exactly when to tune in — no more missed services"
- Integration with church culture: "Schedule Sunday service, Wednesday prayer meeting, Friday youth program"
- "Scheduled streams send automatic reminders" (if this feature exists or is planned)

## 13.7 Private Streams

**What it does:** Password-protected streams accessible only to people with the link and password.

**How to market it:**
- "For leadership meetings, pastoral conferences, members-only services"
- "Full privacy — only your invited congregation can listen"
- Security-first framing: "No one stumbles in accidentally"

## 13.8 Embeddable Player

**What it does:** A small piece of code the broadcaster adds to their website, showing a live audio player with a "Listen Live" button.

**How to market it:**
- "Add 'Listen Live' to your church website in 2 minutes"
- Show the embed code next to a preview of the player widget
- Emphasize it works on WordPress, Google Sites, Wix — platforms Nigerian churches use
- "Your listeners never need to leave your website"

## 13.9 Stream Links

**What it does:** A unique, shareable URL for each stream. Anyone with the link can listen in any browser.

**How to market it:**
- "Share one link on WhatsApp and everyone can listen — on any phone"
- "No app download required for listeners"
- The simplicity IS the feature — every listener needs is a link

## 13.10 Low Data Mode

**What it does:** Streams at 32kbps bitrate (optionally 64kbps). Dramatically reduces data consumption while maintaining intelligible audio.

**How to market it:**
- **This is the #1 differentiator. Treat it as a flagship feature.**
- Specific: "Less than 15MB per hour of listening"
- Comparison: "Half the data of a standard WhatsApp call"
- For rural congregations: "Works on 2G signals"
- Show a data consumption calculator (interactive: "Enter stream length → see data used")
- This feature deserves its own dedicated feature page AND prominent placement in hero

---

# SECTION 14 — CONTENT ENGINE SKILLS

## 14.1 Blog Strategy

The blog serves two purposes: SEO traffic acquisition + trust-building content.

**Primary content types:**

1. **How-To Guides** (high search volume, high conversion)
   - "How to Live Stream Your Church Service in Nigeria"
   - "How to Set Up an Online Radio Station in 2025"
   - "How to Stream on a Budget: Low Data Tips for African Broadcasters"

2. **Comparison Posts** (capture bottom-of-funnel searchers)
   - "Volantislive vs Mixlr: Which is Better for Nigerian Churches?"
   - "Best Live Streaming Platforms for Churches in Africa"

3. **Education Posts** (build authority, not direct conversion)
   - "Why Audio Streaming Uses Less Data Than You Think"
   - "The Complete Guide to Church Media in Nigeria"
   - "Understanding Internet Radio Licensing in Nigeria"

4. **Success Stories** (conversion reinforcement)
   - "[Church Name] Grew Their Online Congregation by 10x — Here's How"
   - Case studies with specific numbers and quotes

## 14.2 Education-First SEO

Each blog post must:
- Answer a specific question completely (Google's Helpful Content standard)
- Include a contextual CTA related to the post topic (not generic "Sign up")
- Link internally to at least 2 relevant feature or solution pages
- Include a structured FAQ section (Schema markup opportunity)
- Be written at a reading level appropriate for Nigerian English speakers

## 14.3 Church Streaming Content Specifically

The /solutions/churches page is the highest-value page on the site. Support it with:
- Blog cluster of 5–8 posts all linking back to it
- A downloadable PDF: "The Nigerian Church Streaming Guide" (lead magnet)
- Video testimonials from church media directors (if available)

## 14.4 Authority Building Content

Long-form pieces (1,500+ words) that position Volantislive as the domain expert:
- "The State of Church Media Technology in Nigeria (2025)"
- "Internet Radio in West Africa: A Broadcaster's Complete Guide"
- "How African Streaming Differs from Western Platforms"

These posts attract backlinks and establish credibility for institutional decision-makers.

---

# SECTION 15 — TECHNICAL MARKETING AWARENESS

## 15.1 Browser-Based Streaming Positioning

This is a major differentiator. Position it as:

**The Problem with Traditional Tools:**
- Mixlr desktop app requires Windows/Mac — many African broadcasters use phones
- OBS Studio is powerful but requires configuration that overwhelms non-technical users
- Facebook Live requires a Facebook account and depends on Facebook's infrastructure
- YouTube Live requires video

**Volantislive's Answer:**
- Open a browser tab. Click "Go Live." You're broadcasting.
- Works on Android Chrome, Safari on iPhone, desktop browsers
- No install permissions needed for church IT gatekeepers
- Works on school, church, or office computers without admin rights

## 15.2 No-Install Friction Removal

Frame "no download required" as:
- **For the broadcaster:** "Start streaming from any computer, even one that's not yours"
- **For the listener:** "Your congregation just needs a link — no app, no account"
- **For IT-adverse churches:** "Nothing to install on the church computer"

## 15.3 Low Bandwidth Optimization Messaging

Avoid vague claims. Use specifics:
- "32kbps audio — the same quality as FM radio, at a fraction of the data"
- "A 1-hour service uses under 15MB for your listeners"
- "Streams automatically adapt to your listener's connection speed"
- "Tested in Lagos, Kano, Aba, and Enugu — works across Nigeria's network landscape"

## 15.4 Audio-First Efficiency

Marketing framing for the audio-vs-video choice:
- "Your congregation doesn't need to see you — they need to hear you"
- "Audio reaches people driving, cooking, or farming — video doesn't"
- "Audio is how Africans consume preaching — radio built an entire culture"
- "No lighting. No camera. No makeup. Just your message."

This framing validates the product's positioning as a feature, not a limitation.

---

# SECTION 16 — FOOTER AS PRODUCT MAP

## 16.1 Footer Architecture

The footer is navigation infrastructure for people who've scrolled past the point of conversion. Design it as a complete product map.

```
FOOTER LAYOUT (4-column on desktop, stacked on mobile)

COLUMN 1: Volantislive
──────────────
Logo
Tagline: "Streaming that works even when the internet doesn't."
Social icons (Twitter/X, Instagram, YouTube, Facebook)
WhatsApp number

COLUMN 2: Product
──────────────
Features (hub)
Live Streaming
Channel Pages
Low Data Mode
Replay Archive
Analytics
Embeddable Player
Pricing

COLUMN 3: Solutions
──────────────
For Churches
For Ministries
For Community Radio
For Events
For Creators
How It Works

COLUMN 4: Company
──────────────
About Us
Blog
Help Center
Contact
Status Page (uptime)
Privacy Policy
Terms of Service

BOTTOM BAR:
© 2025 Volantislive. Built in Nigeria, for Africa.
[Naira payment icons: Paystack]  [Trust badge: SSL Secured]
```

## 16.2 Footer Rules

- Never truncate the footer on mobile — stack columns vertically
- "Status Page" in footer is a trust signal — link to uptime monitoring
- "Built in Nigeria" copy is deliberate brand positioning — include it
- Payment method logos near bottom reinforce Naira pricing trust

---

# SECTION 17 — ANTI-PATTERNS (CRITICAL — READ BEFORE EVERY PAGE)

## 17.1 Never Assume Fast Internet

❌ "Watch our demo video to see how it works"
✅ "Read how it works below" or use a static animated GIF under 500KB

❌ Autoplay hero video
✅ Static hero image with CSS animation or none

❌ Loading heavy JavaScript libraries unnecessarily
✅ Ship minimal JS; validate with Lighthouse on simulated 3G

## 17.2 Never Use Silicon Valley Jargon

❌ "Leverage our cutting-edge WebRTC-powered streaming infrastructure"
✅ "Stream live from your browser — no downloads needed"

❌ "Seamless omnichannel listener experience"
✅ "Your listeners can tune in from any phone, anywhere"

❌ "Best-in-class uptime SLA with enterprise-grade redundancy"
✅ "Your stream stays live — even if your internet drops briefly"

## 17.3 Never Overcomplicate Onboarding

The signup form must be:
- Email + Password only (no phone number required at signup)
- Optional profile completion after first login
- No credit card required for free plan
- First action after signup: immediate "Go Live" path (not a 5-step wizard)

## 17.4 Never Present Pricing Like US SaaS

❌ $19/month (USD only)
❌ Plans named "Starter", "Professional", "Enterprise" with no African context
❌ Hidden pricing ("Contact us for pricing")

✅ ₦4,500/month (≈$3 USD)
✅ Plans named by use case: "Starter", "Church", "Ministry"
✅ All pricing visible without contacting sales

## 17.5 Never Use Video-First Assumptions

❌ "Stream your content live with HD video and audio"
✅ "Stream live audio — crystal clear, minimal data"

The product is audio-first. Never suggest video capability if it doesn't exist. Never frame audio as a limitation.

## 17.6 Never Ignore the Mobile Broadcaster

A significant portion of users will broadcast from their phone, not a laptop. Every feature description must consider mobile broadcaster UX. Screenshots should show both desktop and mobile interfaces.

---

# SECTION 18 — EXECUTION RULES (NEXT.JS IMPLEMENTATION)

## 18.1 Tech Stack

```
Framework:     Next.js 14 (App Router)
Language:      TypeScript
Styling:       Tailwind CSS
Animations:    Framer Motion (selective use only)
Fonts:         next/font (Google Fonts: Plus Jakarta Sans + DM Sans)
Images:        next/image (WebP, lazy loaded)
Icons:         Lucide React
Forms:         React Hook Form + Zod
CMS (Blog):    MDX files or Contentlayer (static) / Sanity (dynamic)
Analytics:     Plausible or Simple Analytics (privacy-first, fast)
```

## 18.2 Project Structure

```
/app
  /(marketing)
    /layout.tsx              # Marketing layout: nav + footer
    /page.tsx                # Homepage
    /features
      /page.tsx              # Features hub
      /[feature]/page.tsx    # Individual feature pages
    /solutions
      /page.tsx              # Solutions hub
      /[solution]/page.tsx   # Individual solution pages
    /pricing/page.tsx
    /how-it-works/page.tsx
    /about/page.tsx
    /contact/page.tsx
    /blog
      /page.tsx              # Blog index
      /[slug]/page.tsx       # Blog post
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(help)
    /help
      /layout.tsx            # Help center layout
      /page.tsx              # Help center home
      /[category]/page.tsx   # Category
      /[category]/[article]/page.tsx  # Article
/components
  /ui                        # Primitive components (Button, Card, Badge)
  /marketing                 # Marketing-specific components
    /nav.tsx
    /footer.tsx
    /hero.tsx
    /testimonial.tsx
    /feature-card.tsx
    /pricing-card.tsx
    /trust-bar.tsx
  /shared                    # Shared across marketing + app
/lib
  /config/site.ts            # Site metadata, URLs, nav config
  /config/pricing.ts         # Pricing data
  /config/features.ts        # Feature definitions
  /config/solutions.ts       # Solutions definitions
  /utils.ts
/content
  /blog                      # MDX blog posts
  /help                      # MDX help articles
/public
  /images
  /fonts (if self-hosted)
```

## 18.3 Agent Execution Sequence

Before writing code for any page, run this mental checklist:

```
STEP 1: IDENTIFY
□ Which page am I building?
□ Who is the primary visitor to this page?
□ What is the single most important action on this page?

STEP 2: STRUCTURE
□ What sections does this page need? (Reference Section 4–8)
□ What is the headline?
□ What is the primary CTA? Secondary CTA?
□ What trust signals does this page need?

STEP 3: CONTENT
□ What problem does this page solve for the visitor?
□ Are all claims specific (numbers, outcomes) not vague (adjectives)?
□ Is the language free of Silicon Valley jargon? (Section 17.2)
□ Is pricing shown in Naira if this page references cost?

STEP 4: LINKING
□ What upstream link does this page have?
□ What lateral links are appropriate?
□ What downstream link leads toward conversion?

STEP 5: PERFORMANCE CHECK
□ Are all images using next/image with proper sizing?
□ Are fonts loaded via next/font?
□ No autoplay video?
□ Is the page renderable in <2s on 3G? (target <500KB initial load)

STEP 6: MOBILE CHECK
□ Is the layout mobile-first?
□ Are all touch targets ≥44px?
□ Is the primary CTA visible without scrolling on mobile?

STEP 7: SEO CHECK
□ Is the page title set? (≤60 characters)
□ Is the meta description set? (≤155 characters, includes primary keyword)
□ Is there a single H1 on the page?
□ Are heading levels hierarchical (H1 → H2 → H3)?
□ Are internal links using descriptive anchor text?
```

## 18.4 Component Standards

```typescript
// Button component — always use this pattern
// /components/ui/button.tsx

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  href?: string
  onClick?: () => void
  fullWidth?: boolean
}

// Primary: sky blue background, white text
// Secondary: sky blue border, sky blue text, transparent background
// Ghost: no border, sky blue text

// CTA text rules:
// Primary: Action verb + outcome ("Start Streaming Free")
// Secondary: Direction verb ("See How It Works →")
// Never: "Submit", "Click Here", "Learn More" without context
```

## 18.5 Page Metadata Pattern

```typescript
// Every page must export metadata
export const metadata: Metadata = {
  title: 'Page Title | Volantislive',
  description: 'One sentence describing the page (≤155 chars). Include primary keyword.',
  openGraph: {
    title: 'Page Title',
    description: 'OG description for social sharing',
    image: '/og/page-name.png',  // 1200×630 per page
  },
}
```

## 18.6 Reusable Section Components

Build these as shared components — they appear on multiple pages:

```typescript
// components/marketing/testimonial.tsx
// Used on: Homepage, Solutions pages, Pricing
// Props: name, role, church, city, quote, photoUrl

// components/marketing/feature-preview.tsx
// Used on: Homepage, Features Hub, Solution pages
// Props: title, description, icon, href (→ feature page)

// components/marketing/pricing-card.tsx
// Used on: Pricing page, Solutions pages (mini version)
// Props: plan, priceNaira, priceUSD, features[], isPopular, ctaText

// components/marketing/trust-bar.tsx
// Used on: Homepage (below hero), Pricing (above fold)
// Props: stats[] — e.g., [{value: "500+", label: "Churches"}]

// components/marketing/cta-section.tsx
// Used on: Every page (near bottom)
// Props: headline, subtext, primaryCta, secondaryCta
```

## 18.7 SEO Infrastructure

```typescript
// lib/config/site.ts
export const siteConfig = {
  name: 'Volantislive',
  description: 'Live audio streaming built for Africa. Works on any connection.',
  url: 'https://volantislive.com',
  ogImage: 'https://volantislive.com/og/default.png',
  links: {
    twitter: 'https://twitter.com/volantislive',
    whatsapp: 'https://wa.me/234XXXXXXXXXX',
  },
  keywords: [
    'live audio streaming Nigeria',
    'church streaming Nigeria',
    'low data streaming Africa',
    'online radio Nigeria',
    'live stream church service',
  ],
}
```

Implement JSON-LD structured data on:
- Homepage (Organization schema)
- Blog posts (Article schema)
- How It Works (HowTo schema)
- Pricing (Product + Offer schema)
- Help articles (FAQPage schema)

## 18.8 Animation Philosophy

Use Framer Motion selectively and purposefully:

```typescript
// Approved animation patterns:
// 1. Fade-up on scroll (section entrances)
// 2. Staggered children (feature card grids)
// 3. Counter animation (stats: 0 → 500+)
// 4. Live pulse dot (red dot for LIVE indicator)

// Banned animation patterns:
// 1. Page transitions (slow, disorienting on mobile)
// 2. Parallax (costly on low-end devices)
// 3. Continuous background animations
// 4. Hover animations that reveal essential content
//    (users on mobile have no hover state)
```

## 18.9 Forms Pattern

```typescript
// All forms: React Hook Form + Zod validation
// Signup form: email + password only (minimal friction)
// Contact form: name + email + message + "church/organization" (optional)
// Never use: native HTML form submission
// Always: client-side validation before submit
// Always: loading state on submit button
// Always: success state after submission
// Error messages: specific, not generic (Section 10.3)
```

## 18.10 Internalization Readiness

Even if launching Nigeria-only:
- Store all copy in `/lib/content/` or translation files from day 1
- Use Next.js `next-intl` if multi-language is planned (Yoruba, Igbo, Hausa versions are high-value SEO targets)
- Currency formatting utility:
```typescript
// lib/utils/currency.ts
export const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
// Output: ₦4,500.00
```

---

# SECTION 19 — PAGE-BY-PAGE QUICK REFERENCE

| Page | Primary Visitor | Primary CTA | Trust Signal | Key Section |
|---|---|---|---|---|
| Homepage | Any first-time visitor | Start Streaming Free | Testimonials + listener count | Problem framing (S4.2) |
| /features | Feature researcher | Try [Feature] | Feature specifics | Transformation headlines (S5.3) |
| /solutions/churches | Church media director | Start Your Church Stream | Named church testimonials | Audience recognition (S6.2) |
| /pricing | Budget decision-maker | Start Free Trial | "No credit card" + WhatsApp | Naira pricing (S7.1) |
| /how-it-works | Skeptic, researcher | See Pricing | Step-by-step clarity | 3-step simplicity |
| /blog/[slug] | SEO traffic | See How Volantislive Works | Authority content | Internal links (S14.2) |
| /about | Institutional vetter | Contact Us | Team, story, Nigerian roots | Trust building (S12) |
| /signup | High-intent converter | Create My Account | "Free — no card needed" | Minimal form (S18.9) |

---

# SECTION 20 — VOLANTISLIVE UNIQUE POSITIONING STATEMENTS

These are not taglines — they are the strategic truths the website must communicate:

1. **"The only streaming platform that was designed for Africa's networks — not just adapted for them."**

2. **"Your Sunday service should reach every member — whether they're in Lagos, London, or a village with 2G."**

3. **"While other platforms assume you have fast internet, we assume you don't."**

4. **"You shouldn't need a studio, a degree in broadcasting, or a fast connection to go live."**

5. **"Audio is how Africa has always consumed faith and community. We built the platform for that."**

Each page of the site should echo one of these truths — not verbatim, but in spirit. The website is not selling software. It is validating a belief: that African creators and faith communities deserve tools built specifically for their reality.

---

*End of SKILL.md — Volantislive Next.js Website System*
*This document is the complete intelligence layer for building the Volantislive marketing and product website.*
*Agent must re-read relevant sections before building each page. No exceptions.*