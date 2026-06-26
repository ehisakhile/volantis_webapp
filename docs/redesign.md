# Creator Studio — UI/UX Redesign Prompt

## Mission

Redesign the `CreatorStreaming` component (`creator-streaming.tsx`) into a world-class, professional live-streaming interface. **Do not touch any business logic, WebRTC code, API calls, hooks, or state management.** Everything that works today must keep working exactly as-is. This is a pure UI/UX layer transformation.

---

## Core Design Principles

1. **Video/audio preview is king.** The visualizer canvas and live stats are the focal point of the screen at all times — every other panel is subordinate to it.
2. **Progressive disclosure.** Casual solo streamers see a clean, minimal interface. Power users and broadcast teams can unlock more density via collapsible panels and dock arrangements.
3. **Mobile-first, desktop-enhanced.** The layout must be fully functional and comfortable on a 375px phone screen before being enhanced for tablet and desktop breakpoints.
4. **Zero cognitive load to go live.** The primary action (Go Live / End Stream / Resume) must always be visible without scrolling, on any screen size.
5. **Theme parity.** Light and dark modes are first-class citizens — neither is an afterthought.

---

## Theme System

### Dark Mode (default)
- Background base: `#080B10` (near-black, cooler than slate-950)
- Surface cards: `#0F1419` with `1px` border `#1E2530`
- Surface elevated (modals, tooltips): `#161D27`
- Primary accent: `#00D4FF` (electric cyan) — used for active states, live indicators, focus rings
- Success / Live: `#00E5A0` (keep existing green for the visualizer; use for "LIVE" badge)
- Danger: `#FF4757`
- Warning: `#FFB830`
- Text primary: `#F0F4F8`
- Text secondary: `#8899AA`
- Text muted: `#4A5568`

### Light Mode
- Background base: `#F4F7FA`
- Surface cards: `#FFFFFF` with `1px` border `#E2E8F0`
- Surface elevated: `#FFFFFF` with shadow `0 4px 24px rgba(0,0,0,0.08)`
- Primary accent: `#0077CC`
- Success / Live: `#00A86B`
- Danger: `#DC2626`
- Warning: `#D97706`
- Text primary: `#0F172A`
- Text secondary: `#475569`
- Text muted: `#94A3B8`

### Theme Toggle
- Implement a single icon button (sun/moon) pinned to the top-right of the header.
- Persist preference to `localStorage` key `creator-studio-theme`.
- Apply theme via a `data-theme="dark"|"light"` attribute on the root container, with CSS custom properties driving all colors.
- Use Tailwind `dark:` variants where native; otherwise use CSS vars for anything Tailwind can't reach (canvas colors, custom gradients).

---

## Layout Architecture

### Breakpoints
| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Single column, stacked panels, bottom sheet panels |
| Tablet | 768–1199px | Two-column: preview (left 60%) + sidebar (right 40%) |
| Desktop | ≥ 1200px | Three-region: left dock + main preview + right dock |

### Three-Region Desktop Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER BAR (full width, 56px)                              │
├───────────┬─────────────────────────────────┬───────────────┤
│           │                                 │               │
│  LEFT     │       MAIN PREVIEW              │  RIGHT        │
│  DOCK     │       (flex-grow)               │  DOCK         │
│  (260px)  │                                 │  (300px)      │
│           │                                 │               │
│  - Audio  │  [Visualizer Canvas]            │  - Chat       │
│    Source │  [Stats row]                    │  - Viewers    │
│  - Stream │  [Stream info cards]            │  - Recording  │
│    Setup  │  [Go Live button]               │    Status     │
│  - Mixer  │                                 │               │
│           │                                 │               │
└───────────┴─────────────────────────────────┴───────────────┘
```

- Each dock panel is independently collapsible (chevron toggle, animates width to 0 with panel content fading out). Collapsed docks show icon-only rail (40px wide).
- Collapsed state persists in `localStorage` keys `studio-left-dock-collapsed` and `studio-right-dock-collapsed`.
- On tablet, the right dock becomes a bottom-anchored drawer; left dock becomes a slide-in sheet triggered by a Settings icon.
- On mobile, everything collapses into a single scrollable column with the preview pinned at top.

---

## Header Bar

Height: 56px. Full width. Sticky / fixed to top.

**Left side:**
- App logo / wordmark (small, 20px tall)
- Breadcrumb: "Creator Studio" (non-link) › "Audio" | "Video" (active tab) — these are the two mode links already in the component (`/creator/video`).

**Center:**
- When NOT streaming: empty or tagline "Ready to go live"
- When streaming: animated red pulsing dot + "LIVE" badge + stream title (truncated to 32 chars) + duration counter (monospace, ticking)

**Right side:**
- Viewer count chip (eye icon + number) — only when streaming
- Theme toggle (sun/moon icon)
- Avatar / account menu (keep minimal, just a placeholder circle if no user data available in this component)

---

## Left Dock — Controls

### Panel 1: Audio Source
Collapsible section with header "Source" and a `Mic` icon.

- Replace the current plain radio buttons with styled **source cards**: each source option (Microphone, System Audio) is a clickable card with an icon, label, and a subtle border. Selected card gets the primary accent border + background tint.
- When Microphone is selected and not streaming, show an inline device picker (compact dropdown, not the current expand/collapse text button pattern).
- When streaming, show a small live level meter (vertical bar, 8px wide) next to the selected source card using the existing audio level data.
- Disable all source cards during streaming with a `locked` visual state (padlock icon overlay, tooltip "Cannot change source while live").

### Panel 2: Stream Setup
Collapsible section with header "Broadcast" and a `Radio` icon.

- **Not streaming + no active stream:** Show title input, description textarea, thumbnail uploader — same fields as today but restyled:
  - Inputs: rounded-xl, 44px height, accent focus ring, floating label animation.
  - Thumbnail uploader: drag-and-drop zone with dashed border and upload icon; preview replaces the zone when image is selected (with remove button overlay on hover).
- **Not streaming + active stream detected:** Show the "Active Stream Detected" card (keep logic), but redesign it as a prominent card with a pulsing cyan border, stream title in large text, start time, and a "Resume Broadcast" primary button.
- **Streaming:** Collapse this panel to just a read-only summary: stream title + "Edit" link that opens a small popover (title/description only; thumbnail cannot change mid-stream).

### Panel 3: Mixer (only shown when streaming and mixer is available)
Keep `CreatorMixer` component but wrap it in a collapsible section with header "Mixer" and a `SlidersHorizontal` icon. Default: collapsed on mobile, expanded on desktop.

---

## Main Preview Area

This region must command attention. Treat it like a broadcast monitor.

### Visualizer Canvas
- Container: `aspect-video` (16:9 ratio) on desktop; `aspect-[4/3]` on mobile — this ensures the canvas always fills the available width without overflow.
- Background: `#000000` (true black), `border-radius: 12px`, subtle glow shadow `0 0 0 1px rgba(0,229,160,0.15), 0 8px 32px rgba(0,0,0,0.6)` when streaming.
- When NOT streaming: show a centered placeholder — icon (`Radio`), heading "No Signal", subtext "Configure your source and hit Go Live".
- When streaming: canvas renders the waveform (keep existing `startVisualizer` logic). Add a semi-transparent pill overlay in the top-left: pulsing red dot + "LIVE" + duration. Add the "MIC INPUT" label (top-right, keep existing) as a small monospace badge.
- Canvas glow color should follow theme: `#00E5A0` dark mode, `#00A86B` light mode.

### Go Live / End Stream Button
Place a large, full-width (on mobile) or 280px centered (on desktop) primary CTA button **directly below the visualizer**, always visible:
- **Offline:** Large green "Go Live" button with `Radio` icon. Disabled + tooltip if title is empty.
- **Connecting:** Button becomes loading state (spinner + "Connecting…") and is non-interactive.
- **Streaming:** Button becomes a red "End Stream" button with `Square` icon. Add a confirmation step — single click shows "Tap again to confirm" state for 3 seconds, second click executes stop. This prevents accidental stream termination.
- **Resume state:** Teal/cyan "Resume Broadcast" button.

On desktop, this CTA button lives inside the preview panel, centered below the canvas. On mobile, it becomes a sticky bottom bar (fixed to bottom of viewport, full width, 72px height, 16px horizontal padding, with safe-area-inset-bottom support for iOS).

### Stats Row
Below the CTA button (above on mobile: below canvas, above CTA sticky bar):
- Redesign the three stat boxes (State, Codec, Bitrate) into a horizontal pill bar — a single `bg-surface` rounded-full container with three sections separated by subtle dividers. More compact, less boxy.
- Add a fourth section: Recording status indicator (dot + "REC" when recording, greyed out otherwise).

### Stream Info Cards
The four cards (Status, Duration, Viewers, Audio) become a 2×2 grid on mobile and a single horizontal row on desktop. Redesign each card:
- Remove the current boxy `bg-slate-800` style.
- Use ghost cards: just the icon + label above, value below, no background fill in dark mode (let the base surface show through), very subtle `1px` border.
- "Viewers" card: show `realtimeViewerCount` with a sparkline-style micro trend (just a simple SVG path of last 6 values if tracked in a small rolling state array — add this state, it's UI-only, no API calls).

---

## Right Dock — Live Chat

### Chat Panel
The most important right-dock panel during a live stream.

- Messages area: `flex-1 overflow-y-auto` with `scroll-snap-type: y proximity` so new messages snap into view.
- Message bubbles: two-tone — viewer messages use subtle `bg-surface-elevated` pill; creator's own messages (sent by host) use accent-tinted pill.
- Username: accent color, bold, 12px. Timestamp: muted, 10px, shown on hover only (saves space).
- Reply thread: when replying, show a compact quote block above the input (already implemented, just restyle as a rounded chip with left accent border).
- Input bar: full-width, 44px height, rounded-xl, `Send` button icon-only (no text label on mobile). Press Enter to send (already implemented).
- "No messages yet" empty state: centered icon + text, no filler.
- Chat visible only when streaming — keep existing logic. When not streaming, hide the panel entirely or show a "Chat will appear when you go live" placeholder.

---

## Modals

All modals should use the same base:
- Backdrop: `bg-black/70 backdrop-blur-md`
- Container: `bg-surface-elevated`, `border border-surface-border`, `rounded-2xl`, `shadow-2xl`, max-width 400px, centered with `motion` entry (scale + fade, 200ms ease-out — already done in some modals, standardize all).
- Close button (×) in top-right where applicable.

### Recording Prompt (`RecordingPrompt`)
Keep logic, restyle:
- Large `Video` icon centered at top.
- Headline: "Record this stream?" — large, bold.
- Two action buttons stacked vertically (full width on mobile): "Yes, record + save locally" and "Yes, record + auto-upload" and "No thanks, skip recording" (ghost/muted).

### Stream Ended Modal
Keep the existing "That's a wrap!" design intent but polish:
- Stat card: show both peak viewers AND total duration side by side.
- CTA: "View Dashboard" — primary. Add secondary "Share Replay Link" button (copy to clipboard) if `currentStream.slug` is available.

### Upload Success Modal
Consistent with above — same base style.

### Stream Limit Modal
Use a warning color scheme (amber). Add a "Upgrade Plan" CTA alongside "OK".

---

## Notifications & Banners

### Network Status Banner
Current: fixed top center. Keep position but restyle:
- Full-width banner anchored to top of viewport (below the fixed header), not a floating pill.
- Red for offline, amber for degraded (failed ICE state), auto-dismiss on recovery with a brief "Back online" green flash for 2 seconds.

### Usage Warning Banner (`StreamUsageBanner`)
- Anchor it to the top of the main preview area, not globally floating.
- Amber color scheme. Dismiss × button. Shows only once per session (already handled by `usageBannerDismissed` state).

---

## Panel Visibility Controls (Dock Collapse / Hide)

Add a small toolbar in the header (right side, before theme toggle) with three icon-toggle buttons:
- `PanelLeft` icon — toggle left dock
- `LayoutPanelTop` icon — toggle stats/info rows in the main preview
- `PanelRight` icon — toggle right dock (chat)

Tooltip on hover for each: "Hide Controls", "Hide Stats", "Hide Chat".

On mobile, replace this toolbar with a bottom sheet triggered by a `MoreVertical` (⋮) icon. The sheet lists the same panels with toggle switches.

---

## Animations & Micro-interactions

Use `framer-motion` (already imported) consistently:

- **Panel collapse:** `AnimatePresence` + `motion.div` with `initial={{ opacity: 0, height: 0 }}` / `animate={{ opacity: 1, height: "auto" }}` / `exit={{ opacity: 0, height: 0 }}`.
- **LIVE badge:** Pulsing scale animation `scale: [1, 1.05, 1]` on 2s loop.
- **Go Live button:** On hover, subtle scale up `1.02`. On press, scale down `0.97`.
- **Stat value changes:** When bitrate or viewer count updates, flash the value with a brief amber highlight (CSS transition on `color`, not JS).
- **Chat new message:** Incoming messages slide in from bottom with `y: 10 → 0, opacity: 0 → 1`.
- **Theme toggle:** Rotation animation on the icon (sun rotates in, moon rotates out).
- **Modal entry:** Already uses scale + fade — keep it, standardize across all modals.

Do NOT add animations that run continuously in the background (no idle pulse animations on cards, no floating particles). Only animate in response to state changes or user interactions.

---

## Accessibility

- All interactive elements must have `aria-label` attributes.
- Focus ring: `outline: 2px solid var(--accent)` with `outline-offset: 2px`, never `outline: none`.
- Color contrast: all text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in both themes.
- The sticky mobile CTA button must have `aria-live="polite"` and update its `aria-label` when state changes ("Go Live", "Connecting", "End Stream").
- Canvas element: add `aria-label="Audio level visualizer"` and `role="img"`.
- Chat messages list: `role="log"` with `aria-live="polite"` so screen readers announce new messages.

---

## Mobile-Specific Considerations

- The sticky bottom CTA bar on mobile must sit above any browser chrome (use `padding-bottom: env(safe-area-inset-bottom)`).
- The visualizer canvas on mobile: tap it to toggle a compact stats overlay (glass morphism overlay with codec/bitrate/ICE state). Tap again to dismiss.
- Chat on mobile: collapsed by default into a floating bubble (bottom-right, shows unread count badge). Tap to expand as a full-height bottom sheet. Dismiss by swiping down.
- The left dock on mobile: accessible via a hamburger/settings icon in the header. Opens as a slide-in sheet from the left (full height, 80vw wide, with backdrop).
- No horizontal scrolling anywhere on mobile.
- Touch targets: minimum 44×44px for all tappable elements.

---

## What Must NOT Change

- All `useState`, `useCallback`, `useEffect` logic and their dependencies.
- All WebRTC peer connection code (`pcRef`, `pcRef.current`, ICE handling, SDP manipulation).
- All API call sites (`livestreamApi`, `chatApi`, `companyApi`).
- All imported hooks (`useStreamRecorder`, `useViewerCount`, `useStreamUsage`).
- All child components (`CreatorMixer`, `RecordingPrompt`, `RecordingStatus`, `CreatorNotStreamingModal`, `StreamUsageBanner`, `StreamLimitModal`) — only their wrapping containers may be restyled.
- The `recorder` hook interface and all `recorder.state.*` reads.
- The `router.push("/dashboard")` redirects.
- The `Link` to `/creator/video`.
- `handleStartStream`, `handleStopStream`, `handleReconnectToStream`, `handleStartNewStream` — their internal logic is untouched.
- Existing canvas ref (`canvasRef`) and visualizer start/stop logic.

---

## Deliverables

1. **`creator-streaming.tsx`** — The fully redesigned component. Same file, same exports, zero logic changes.
2. **`creator-streaming.css`** (or inline Tailwind + CSS vars) — Theme variables, custom animations, any styles that can't be expressed in Tailwind alone.
3. Brief inline comments (`// DESIGN:`) on any structural JSX change that might confuse a future developer about why the markup changed from the original.

---

## Agent Instructions

1. Read the original `creator-streaming.tsx` in full before writing a single line of output.
2. Identify every piece of state, every handler, every ref — list them mentally and mark them as "preserve untouched".
3. Build the new JSX structure from the outside in: header → three-region layout shell → left dock → main preview → right dock.
4. Implement the theme system first (CSS vars on root, toggle button, localStorage), then apply to all surfaces.
5. Implement the responsive layout (CSS Grid with named areas: `header`, `left`, `main`, `right`).
6. Port each logical section (audio source, stream setup, visualizer, stats, chat, modals) into the new layout, restyling only the wrapping and presentational elements.
7. Add the panel collapse state (two `useState<boolean>` hooks for left/right dock) and the panel toolbar.
8. Add the mobile sticky CTA bar using a conditional render based on a `useMediaQuery(768)` hook or Tailwind's responsive hidden/block utilities.
9. Add the mobile chat bottom sheet (use `framer-motion` `AnimatePresence` + `motion.div` with `y: "100%"` initial).
10. Run a final pass: verify that every original prop, ref, and handler is still wired to the same JSX element it was before.