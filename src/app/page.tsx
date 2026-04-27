"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Play, Radio, Users, Zap, Shield, Clock,
  CheckCircle, Star, Menu, X, Volume2, Signal, ChevronRight,
  Wifi, Globe, Mic, BarChart3, Headphones, RadioIcon, Podcast,  Download,
  Music, Mic2, Church, RadioTower, Mic as MicIcon
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatItem { value: string; label: string; }
interface FeatureItem { icon: React.ElementType; title: string; description: string; href: string; image: string; }
interface TestimonialItem { name: string; role: string; organization: string; quote: string; rating: number; avatar: string; }

// ─── Data ─────────────────────────────────────────────────────────────────────
const stats: StatItem[] = [
  { value: "1,200+", label: "Active Streams" },
  { value: "150K+", label: "Monthly Listeners" },
  { value: "99.5%", label: "Uptime SLA" },
  { value: "32kbps", label: "Minimum Bandwidth" },
];

const features: FeatureItem[] = [
  {
    icon: Zap,
    title: "Low Data Mode",
    description: "Your listeners use less than 1MB per minute. Works on 2G networks across Africa.",
    href: "/features/low-data-mode",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  },
  {
    icon: Radio,
    title: "Go Live in Seconds",
    description: "Start broadcasting from any browser. No downloads, no technical setup required.",
    href: "/features/live-streaming",
    image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&q=80",
  },
  {
    icon: Users,
    title: "Channel Pages",
    description: "Your own branded streaming page. Share one link with your entire audience.",
    href: "/features/channel-pages",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80",
  },
  {
    icon: Clock,
    title: "Auto Replay",
    description: "Every broadcast saved automatically. Listeners who missed can tune in anytime.",
    href: "/features/replay-archive",
    image: "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?w=600&q=80",
  },
];

const testimonials: TestimonialItem[] = [
  {
    name: "Pastor Emmanuel Okonkwo",
    role: "Senior Pastor",
    organization: "Grace Assembly, Lagos",
    quote: "Our online congregation grew by 300% in 3 months. Members from across Nigeria — even in rural areas — can now join every Sunday.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
  },
  {
    name: "Ade Banks",
    role: "Podcast Host",
    organization: "The African Voice",
    quote: "The low data mode is a game-changer. My listeners in rural areas never miss an episode. This is exactly what African creators needed.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80",
  },
  {
    name: "Blessing Okafor",
    role: "Radio Presenter",
    organization: "Community Radio, Ibadan",
    quote: "Setup took 10 minutes. We went live and had 500+ listeners within the first hour. The simplest streaming tool we've ever used.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&q=80",
  },
];

const audioCreators = [
  "Podcasters", "Community Radio", "Musicians", "Churches",
  "Talk Shows", "Educators", "Event Organizers", "Storytellers",
];

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function useCountUp(target: number, duration = 2000, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);
  return count;
}


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
 
  @keyframes vl-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.25); }
    50%       { box-shadow: 0 0 0 7px rgba(34,197,94,0.08); }
  }
 
  .vl-hero * { box-sizing: border-box; }
 
  .vl-hero {
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
    background: linear-gradient(160deg, #f0f9ff 0%, #f8fafc 50%, #e0f2fe 100%);
    padding: 80px 24px 72px;
  }
 
  .vl-orb1 {
    position: absolute; top: -80px; right: -80px;
    width: 380px; height: 380px; border-radius: 50%;
    background: radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%);
    pointer-events: none;
  }
 
  .vl-orb2 {
    position: absolute; bottom: -60px; left: -60px;
    width: 300px; height: 300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%);
    pointer-events: none;
  }
 
  /* Centered column */
  .vl-inner {
    position: relative;
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
 
  .vl-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.28);
    color: #0369a1; padding: 5px 16px; border-radius: 100px;
    font-size: 0.8rem; font-weight: 600; margin-bottom: 22px;
  }
 
  .vl-pulse {
    width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.25);
    animation: vl-pulse 2s infinite;
    flex-shrink: 0;
  }
 
  .vl-h1 {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800;
    font-size: clamp(2rem, 5vw, 3.4rem);
    line-height: 1.08;
    color: #0f172a;
    margin: 0 0 18px;
  }
 
  .vl-h1-grad {
    background: linear-gradient(135deg, #0ea5e9, #0369a1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
 
  .vl-sub {
    font-size: 1.05rem; color: #475569; line-height: 1.7;
    max-width: 500px; margin: 0 0 40px;
  }
 
  /* ── App Card ── */
  .app-card {
    width: 100%;
    background: white;
    border: 1.5px solid rgba(14,165,233,0.22);
    border-radius: 20px;
    padding: 28px;
    box-shadow: 0 8px 40px rgba(14,165,233,0.1), 0 2px 12px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
    margin-bottom: 28px;
  }
 
  .app-card-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #0ea5e9, #22c55e, #0369a1);
  }
 
  .app-card-header {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 24px;
  }
 
  .app-icon {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #beeaff, #fafdfe);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(0, 41, 59, 0.3);
  }
 
  .app-name-block { text-align: left; flex: 1; }
  .app-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 1.1rem; color: #0f172a; margin: 0 0 3px; }
  .app-desc  { font-size: 0.8rem; color: #64748b; margin: 0; }
 
  .live-chip {
    background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3);
    color: #15803d; padding: 4px 12px; border-radius: 100px;
    font-size: 0.75rem; font-weight: 700;
    display: flex; align-items: center; gap: 5px; white-space: nowrap; flex-shrink: 0;
  }
 
  .live-chip-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
    animation: vl-pulse 2s infinite;
  }
 
  /* ── Store Buttons ── */
  .store-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
 
  .store-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border-radius: 14px;
    text-decoration: none; border: none;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    cursor: pointer;
  }
 
  .store-btn:hover { transform: translateY(-2px); }
 
  .store-btn.android {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    box-shadow: 0 4px 18px rgba(0,0,0,0.18);
  }
 
  .store-btn.ios {
    background: linear-gradient(135deg, #1c1c1e, #2c2c2e);
    box-shadow: 0 4px 18px rgba(0,0,0,0.15);
  }
 
  .store-icon {
    width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
    background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
  }
 
  .store-label { display: flex; flex-direction: column; text-align: left; }
  .store-eyebrow { font-size: 0.67rem; color: rgba(255,255,255,0.55); font-weight: 400; }
  .store-name    { font-size: 0.92rem; font-weight: 700; color: white; }
 
  /* ── APK button ── */
  .apk-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px; border-radius: 12px;
    background: rgba(14,165,233,0.07); border: 1.5px dashed rgba(14,165,233,0.3);
    color: #0369a1; font-size: 0.84rem; font-weight: 600;
    text-decoration: none; cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease;
    font-family: 'DM Sans', sans-serif;
  }
 
  .apk-btn:hover { background: rgba(14,165,233,0.13); border-color: rgba(14,165,233,0.5); }
 
  /* ── Rating row ── */
  .rating-row {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center;
    margin-top: 16px; padding-top: 16px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
 
  .stars { color: #f59e0b; font-size: 0.85rem; letter-spacing: 1px; }
  .rating-label { font-size: 0.8rem; color: #64748b; }
 
  .platform-pills { display: flex; align-items: center; gap: 10px; }
  .platform-pill  { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #64748b; }
  .pdot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
 
  /* ── Secondary CTAs ── */
  .cta-row {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
    margin-bottom: 24px;
  }
 
  .sec-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 11px 22px; border-radius: 10px; text-decoration: none;
    font-size: 0.88rem; font-weight: 600; cursor: pointer; border: none;
    transition: all 0.18s ease; font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
 
  .sec-btn.primary {
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white; box-shadow: 0 4px 16px rgba(14,165,233,0.28);
  }
 
  .sec-btn.ghost {
    background: white; color: #0f172a;
    border: 1.5px solid #e2e8f0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }
 
  /* ── Trust row ── */
  .trust-row {
    display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;
  }
 
  .trust-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.83rem; color: #64748b;
  }
 
  .trust-check {
    width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0;
    background: rgba(34,197,94,0.13); border: 1px solid rgba(34,197,94,0.3);
    display: flex; align-items: center; justify-content: center;
  }
 
  /* ── Responsive breakpoints ── */
  @media (max-width: 520px) {
    .vl-hero { padding: 56px 16px 52px; }
    .store-grid { grid-template-columns: 1fr; }
    .app-card { padding: 20px; }
    .app-card-header { flex-wrap: wrap; }
    .live-chip { order: 3; }
    .cta-row { flex-direction: column; align-items: center; }
    .sec-btn { width: 100%; justify-content: center; }
  }
 
  @media (max-width: 360px) {
    .vl-h1 { font-size: 1.75rem; }
    .vl-sub { font-size: 0.95rem; }
  }
`;


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const statsSection = useScrollAnimation();
  const featuresSection = useScrollAnimation();
  const testimonialsSection = useScrollAnimation();
  const ctaSection = useScrollAnimation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ─── Shared Navbar ─────────────────────────────────────────────────────── */}
      <Navbar />

      <main>
        <style>{styles}</style>
 
      <section className="vl-hero mt-10">
        <div className="vl-orb1" />
        <div className="vl-orb2" />
 
        <div className="vl-inner">
 
          {/* Trust badge */}
          <div className="vl-badge">
            <span className="vl-pulse" />
            Now available on iOS &amp; Android
          </div>
 
          {/* Headline */}
          <h1 className="vl-h1">
            Stream Live Audio to Africa —{' '}
            <span className="vl-h1-grad">Get the App Today</span>
          </h1>
 
          {/* Subheading */}
          <p className="vl-sub">
            Volantislive delivers ultra-low bandwidth audio streaming built for African networks.
            Your audience can tune in from anywhere — download the app and never miss a broadcast.
          </p>
 
          {/* ─── App Download Card ─── */}
          <div className="app-card">
            <div className="app-card-bar" />
 
            {/* Card header */}
            <div className="app-card-header">
              <div className="app-icon">
                 <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
              </div>
              <div className="app-name-block">
                <p className="app-title">Volantislive</p>
                <p className="app-desc">Live audio streaming for African audiences</p>
              </div>
              <div className="live-chip">
                <span className="live-chip-dot" />
                Live now
              </div>
            </div>
 
            {/* Store buttons */}
            <div className="store-grid">
              <a
                href="https://play.google.com/store/apps/details?id=com.volantislive.volantislive"
                className="store-btn android"
              >
                <div className="store-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M3.18 23.76c.33.18.7.22 1.06.1l11.34-6.55-2.53-2.53-9.87 8.98z" fill="#34A853"/>
                    <path d="M.5 1.35A1.5 1.5 0 000 2.5v19a1.5 1.5 0 00.5 1.15l.06.05L13.12 12v-.3L.56 1.3l-.06.05z" fill="#4285F4"/>
                    <path d="M19.8 10.05l-3.22-1.86-2.84 2.84 2.84 2.84 3.23-1.87a1.44 1.44 0 000-1.95z" fill="#FBBC04"/>
                    <path d="M4.24.14L15.58 6.7l-2.53 2.53L3.18.27c.36-.12.74-.08 1.06.1z" fill="#EA4335"/>
                  </svg>
                </div>
                <div className="store-label">
                  <span className="store-eyebrow">Get it on</span>
                  <span className="store-name">Google Play</span>
                </div>
              </a>
 
              <a
                href="https://apps.apple.com/us/app/volantislive/id6762115839"
                className="store-btn ios"
              >
                <div className="store-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </div>
                <div className="store-label">
                  <span className="store-eyebrow">Download on the</span>
                  <span className="store-name">App Store</span>
                </div>
              </a>
            </div>
 
           
 
            {/* Rating / platform row */}
            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span className="rating-label">Available on both stores</span>
              <div className="platform-pills">
                <span className="platform-pill">
                  <span className="pdot" style={{ background: '#34a853' }} /> Android
                </span>
                <span className="platform-pill">
                  <span className="pdot" style={{ background: '#007aff' }} /> iOS
                </span>
              </div>
            </div>
          </div>
 
          {/* Secondary CTAs */}
          <div className="cta-row">
            <a href="/signup" className="sec-btn primary">
              Start Streaming Free <ArrowRight size={15} />
            </a>
            <a href="/listen" className="sec-btn ghost">
              <Headphones size={15} color="#0ea5e9" /> Listen Live
            </a>
            <a href="/how-it-works" className="sec-btn ghost">
              <Play size={14} fill="#0ea5e9" color="#0ea5e9" /> How It Works
            </a>
          </div>
 
          {/* Trust signals */}
          <div className="trust-row">
            {['Free to listen', 'Works on slow networks', 'Trusted by African creators'].map(s => (
              <span key={s} className="trust-item">
                <span className="trust-check">
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {s}
              </span>
            ))}
          </div>
 
        </div>
      </section>
    

        {/* ─── PROBLEM FRAMING ────────────────────────────────────────────── */}
        <section style={{ padding: '96px 24px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div className="section-tag"><Wifi size={13} /> The African Reality</div>
              <h2 style={{ fontFamily: 'Bricolage Grotesque', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                Does this sound familiar?
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 520, margin: '0 auto' }}>
                We built Volantislive because we lived these problems too.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 56 }}>
              {[
                { emoji: '📡', title: 'Your stream cuts out at the best part', desc: 'Right when your audience is most engaged — they get disconnected.', img: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=70' },
                { emoji: '💸', title: 'Your listeners are on expensive mobile data', desc: 'Every megabyte counts. They stop streaming to save data.', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=70' },
                { emoji: '🔧', title: 'Other tools need downloads or fast internet', desc: 'Complex setup. Technical knowledge required. Weeks of delay.', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=70' },
              ].map((p, i) => (
                <div key={i} className="problem-card" style={{ borderRadius: 16, overflow: 'hidden', background: 'white', cursor: 'default' }}>
                  <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                    <img src={p.img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{p.emoji}</div>
                    <h3 style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: '#0f172a', marginBottom: 8, fontSize: '1.05rem' }}>{p.title}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontFamily: 'Bricolage Grotesque', fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                fontWeight: 800,
              }}>
                That's why we built Volantislive — streaming that actually works in Africa.
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ───────────────────────────────────────────────────── */}
        <section
          ref={featuresSection.ref}
          style={{ padding: '96px 24px', background: '#f8fafc' }}
          className="mesh-bg"
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div className="section-tag"><Zap size={13} /> Platform Features</div>
              <h2 style={{ fontFamily: 'Bricolage Grotesque', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                Everything you need to go live
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
                Powerful features designed specifically for African network conditions.
              </p>
            </div>

            {/* Featured large card */}
            <div
              className={`reveal ${featuresSection.visible ? 'visible' : ''}`}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
                borderRadius: 24, overflow: 'hidden', marginBottom: 24,
                boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
              }}
            >
              <div style={{ padding: '48px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.3)',
                  color: '#38bdf8', padding: '5px 14px', borderRadius: 100,
                  fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: 24, alignSelf: 'flex-start',
                }}>
                  Africa's First
                </div>
                <h3 style={{ fontFamily: 'Bricolage Grotesque', color: 'white', fontSize: '2rem', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
                  Low Data Mode — Your Competitive Edge
                </h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 28, fontSize: '1rem' }}>
                  Stream at 32kbps — less than 15MB per hour. Half the data of a WhatsApp voice call.
                  Works on 2G signals across rural Africa.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                  {['Works on 2G', '&lt;15MB/hour', 'Auto-reconnect', 'FM-quality audio'].map(tag => (
                    <span key={tag} style={{
                      background: 'rgba(255,255,255,0.08)', color: '#cbd5e1',
                      padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500,
                    }}>{tag.replace('&lt;', '<')}</span>
                  ))}
                </div>
                <a href="/features/low-data-mode" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  color: '#38bdf8', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
                }}>
                  Explore Low Data Mode <ChevronRight size={18} />
                </a>
              </div>
              <div style={{ position: 'relative', minHeight: 320 }}>
                <img
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&q=80"
                  alt="Audio creator streaming"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.7) 0%, transparent 60%)' }} />
                {/* Data meter overlay */}
                <div style={{
                  position: 'absolute', bottom: 24, right: 24, left: 24,
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
                  borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Data used per hour</span>
                    <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}>~14 MB</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: '14%', background: 'linear-gradient(to right, #0ea5e9, #34d399)', borderRadius: 99 }} />
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 6 }}>vs 100-200MB for video streaming</p>
                </div>
              </div>
            </div>

            {/* Feature grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {features.slice(1).map((feature, i) => (
                <a
                  key={i}
                  href={feature.href}
                  className={`feature-card reveal reveal-delay-${i + 1} ${featuresSection.visible ? 'visible' : ''}`}
                  style={{
                    background: 'white', borderRadius: 20, overflow: 'hidden',
                    textDecoration: 'none', display: 'block',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
                    <img src={feature.image} alt={feature.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
                    <div style={{
                      position: 'absolute', top: 14, left: 14,
                      width: 40, height: 40, borderRadius: 10,
                      background: 'rgba(14,165,233,0.9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(8px)',
                    }}>
                      <feature.icon size={18} color="white" />
                    </div>
                  </div>
                  <div style={{ padding: '20px 22px' }}>
                    <h3 style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: '#0f172a', marginBottom: 8, fontSize: '1.05rem' }}>
                      {feature.title}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 14 }}>
                      {feature.description}
                    </p>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0ea5e9', fontSize: '0.85rem', fontWeight: 600 }}>
                      Learn more <ArrowRight size={14} />
                    </span>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <a href="/features" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: '#0f172a', fontWeight: 600, textDecoration: 'none',
                border: '1.5px solid #e2e8f0', padding: '12px 26px', borderRadius: 12,
                background: 'white', transition: 'all 0.2s',
              }}>
                View All Features <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* ─── CREATOR LOGOS MARQUEE ───────────────────────────────────────── */}
        <div style={{ background: 'white', padding: '36px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
            Trusted by audio creators across Africa
          </p>
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', gap: 64, width: 'max-content' }} className="animate-marquee">
              {[...audioCreators, ...audioCreators].map((creator, i) => (
                <span key={i} style={{ fontSize: '1rem', fontWeight: 600, color: '#cbd5e1', whiteSpace: 'nowrap', fontFamily: 'Bricolage Grotesque' }}>
                  {creator}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SOLUTIONS STRIP ────────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div className="section-tag"><Globe size={13} /> Solutions</div>
              <h2 style={{ fontFamily: 'Bricolage Grotesque', fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#0f172a' }}>
                Built for every audio creator
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Podcasters', icon: '🎙️', href: '/solutions/podcasters', img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=70', desc: 'Episodes, interviews, series' },
                { label: 'Churches', icon: '⛪', href: '/solutions/churches', img: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=1173', desc: 'Sunday services, Devotions' },
                { label: 'Community Radio', icon: '📻', href: '/solutions/community-radio', img: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=70', desc: 'Online radio stations' },
                { label: 'Musicians', icon: '🎵', href: '/solutions/musicians', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=70', desc: 'Live sessions, album launches' },
                { label: 'Talk Shows', icon: '🎤', href: '/solutions/talk-shows', img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=70', desc: 'Discussions, interviews' },
                { label: 'Educators', icon: '📚', href: '/solutions/educators', img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=70', desc: 'Classes, lectures, tutorials' },
              ].map((s, i) => (
                <a key={i} href={s.href} style={{
                  textDecoration: 'none', borderRadius: 16, overflow: 'hidden',
                  position: 'relative', display: 'block', minHeight: 180,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <img src={s.img} alt={s.label} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
                    <p style={{ color: 'white', fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: '1rem' }}>{s.label}</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>{s.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ───────────────────────────────────────────────── */}
        <section
          ref={testimonialsSection.ref}
          style={{ padding: '96px 24px', background: '#f8fafc' }}
          className="mesh-bg"
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div className="section-tag"><Star size={13} fill="currentColor" /> Real Stories</div>
              <h2 style={{ fontFamily: 'Bricolage Grotesque', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Loved by creators across Africa
              </h2>
              <p style={{ color: '#64748b', fontSize: '1rem' }}>Real results from real audio creators.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className={`testimonial-card reveal reveal-delay-${i + 1} ${testimonialsSection.visible ? 'visible' : ''}`}
                  style={{
                    background: 'white', borderRadius: 20, padding: '28px',
                    border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} size={16} fill="#fbbf24" color="#fbbf24" />
                    ))}
                  </div>
                  {/* Quote */}
                  <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: 24, fontSize: '0.95rem', fontStyle: 'italic' }}>
                    "{t.quote}"
                  </p>
                  {/* Author */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={t.avatar}
                        alt={t.name}
                        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e0f2fe' }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 14, height: 14, borderRadius: '50%',
                        background: '#22c55e', border: '2px solid white',
                      }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', fontFamily: 'Bricolage Grotesque' }}>{t.name}</p>
                      <p style={{ color: '#64748b', fontSize: '0.82rem' }}>{t.role}, {t.organization}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── INFRASTRUCTURE TRUST ───────────────────────────────────────── */}
        <section style={{ padding: '80px 24px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
              <div>
                <div className="section-tag"><Shield size={13} /> Built for Africa</div>
                <h2 style={{ fontFamily: 'Bricolage Grotesque', fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                  Infrastructure built for Africa's network reality
                </h2>
                <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: 32, fontSize: '1rem' }}>
                  While others assume you have fast internet, we assume you don't.
                  Every technical decision we make starts from the realities of African connectivity.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { icon: Signal, label: 'Auto-reconnect in under 3 seconds', color: '#0ea5e9' },
                    { icon: Wifi, label: '32kbps minimum — works on 2G', color: '#22c55e' },
                    { icon: Globe, label: 'CDN nodes optimized for Africa', color: '#8b5cf6' },
                    { icon: BarChart3, label: '99.5% uptime SLA with transparent status', color: '#f59e0b' },
                    { icon: Mic, label: 'Audio-first — half the data of video', color: '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <item.icon size={17} color={item.color} />
                      </div>
                      <span style={{ color: '#374151', fontWeight: 500, fontSize: '0.95rem' }}>{item.label}</span>
                      <CheckCircle size={16} color="#22c55e" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                  <img
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=700&q=80"
                    alt="African audience"
                    style={{ width: '100%', height: 400, objectFit: 'cover' }}
                  />
                </div>
                {/* Uptime badge */}
                <div style={{
                  position: 'absolute', top: -16, right: -16,
                  background: 'white', borderRadius: 14, padding: '14px 20px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <span style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.8rem', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>99.5%</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Uptime SLA</span>
                </div>
                {/* Listener count badge */}
                <div style={{
                  position: 'absolute', bottom: -16, left: -16,
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 14, padding: '14px 20px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎧</span>
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Bricolage Grotesque' }}>150,000+ listeners</p>
                    <p style={{ color: '#64748b', fontSize: '0.75rem' }}>every month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ──────────────────────────────────────────────────── */}
        <section
          ref={ctaSection.ref}
          style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden' }}
        >
          {/* Background */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 50%, #0f172a 100%)',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(14,165,233,0.15) 0%, transparent 60%)' }} />

          {/* Content */}
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div
              className={`reveal ${ctaSection.visible ? 'visible' : ''}`}
              style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}
            >
              <div style={{
                position: 'relative', width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 16px rgba(14,165,233,0.1)',
              }}>
                <Radio size={32} color="white" />
              </div>
            </div>
            <h2
              className={`reveal reveal-delay-1 ${ctaSection.visible ? 'visible' : ''}`}
              style={{
                fontFamily: 'Bricolage Grotesque', fontWeight: 800,
                fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'white',
                marginBottom: 16, lineHeight: 1.2,
              }}
            >
              Ready to reach more listeners?
            </h2>
            <p
              className={`reveal reveal-delay-2 ${ctaSection.visible ? 'visible' : ''}`}
              style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: 40, lineHeight: 1.7 }}
            >
              Join 1,200+ audio creators already streaming with Volantislive.
              Start your free plan today — no credit card required.
            </p>
            <div
              className={`reveal reveal-delay-3 ${ctaSection.visible ? 'visible' : ''}`}
              style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <a
                href="/signup"
                className="cta-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: 'white', padding: '16px 36px', borderRadius: 14,
                  fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(14,165,233,0.4)',
                }}
              >
                Start Streaming Free <ArrowRight size={18} />
              </a>
              <a href="/contact" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.08)', color: 'white',
                padding: '16px 32px', borderRadius: 14,
                fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
                border: '1.5px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.2s',
              }}>
                Talk to Sales
              </a>
            </div>
            <div
              className={`reveal reveal-delay-4 ${ctaSection.visible ? 'visible' : ''}`}
              style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}
            >
              {['No credit card required', 'Free plan available', 'Cancel anytime', 'WhatsApp support'].map(s => (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#64748b' }}>
                  <CheckCircle size={14} color="#22c55e" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
        <Footer />
      </main>
    </>
  );
}