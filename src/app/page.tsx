"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Play, Radio, Users, Zap, Shield, Clock,
  CheckCircle, Star, Menu, X, Volume2, Signal, ChevronRight,
  Wifi, Globe, Mic, BarChart3, Headphones, RadioIcon, Podcast,
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function LiveBroadcastCard() {
  const [listeners, setListeners] = useState(847);
  const [waveform] = useState(() => Array.from({ length: 20 }, () => Math.random() * 40 + 10));
  const [waveActive, setWaveActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setListeners(v => v + Math.floor(Math.random() * 3) - 1);
      setWaveActive(v => (v + 1) % 20);
    }, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-sky-500/20 rounded-3xl blur-2xl animate-pulse" />

      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
        {/* Top bar */}
        <div className="bg-slate-900/80 px-5 py-4 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-red-400 font-bold text-xs tracking-widest uppercase">Live Now</span>
          </div>
          <span className="text-slate-400 text-xs">{new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Stream image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&q=80"
            alt="Live audio stream"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-white font-bold text-base">The Morning Vibe</p>
            <p className="text-slate-300 text-sm">with Ade Banks</p>
          </div>
        </div>

        {/* Waveform */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-[3px] h-12 mb-4">
            {waveform.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-300"
                style={{
                  height: `${i === waveActive || i === (waveActive + 1) % 20 ? h * 1.8 : h}%`,
                  background: i <= waveActive
                    ? `linear-gradient(to top, #0ea5e9, #38bdf8)`
                    : '#334155',
                }}
              />
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-sky-500/20 rounded-full flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div>
                <span className="text-white font-bold tabular-nums">{listeners.toLocaleString()}</span>
                <span className="text-slate-400 text-xs ml-1">listening</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3 h-3 text-green-400" />
              <span className="text-green-400 text-xs font-medium">32kbps · Low Data</span>
            </div>
          </div>
        </div>

        {/* Data meter */}
        <div className="mx-5 mb-5 bg-slate-700/50 rounded-lg p-3">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Data used this hour</span>
            <span className="text-sky-400 font-medium">14.3 MB</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-1/5 bg-gradient-to-r from-sky-500 to-sky-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-2 text-xs font-semibold text-slate-700 animate-bounce-slow">
        <Globe className="w-3.5 h-3.5 text-sky-500" />
        Works on 2G
      </div>
      <div className="absolute -bottom-3 -left-3 bg-emerald-500 rounded-xl shadow-xl px-3 py-2 flex items-center gap-2 text-xs font-bold text-white">
        <CheckCircle className="w-3.5 h-3.5" />
        Auto-reconnect active
      </div>
    </div>
  );
}

function StatCard({ stat, index, trigger }: { stat: StatItem; index: number; trigger: boolean }) {
  const num = parseInt(stat.value.replace(/\D/g, "")) || 0;
  const suffix = stat.value.replace(/[\d]/g, "");
  const count = useCountUp(num, 2000 + index * 200, trigger);

  return (
    <div
      className="text-center"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="text-3xl md:text-4xl font-bold text-white mb-1 tabular-nums">
        {trigger ? `${count}${suffix}` : stat.value}
      </div>
      <div className="text-slate-400 text-sm">{stat.label}</div>
    </div>
  );
}

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
        {/* ─── HERO ───────────────────────────────────────────────────────── */}
        <section className="hero-grain" style={{
          position: 'relative', paddingTop: 100, paddingBottom: 80, overflow: 'hidden',
          background: 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 50%, #e0f2fe 100%)',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -100, right: -100, width: 500, height: 500,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, left: -80, width: 400, height: 400,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 48, alignItems: 'center' }}>

              {/* Left: Content */}
              <div style={{ animation: 'slide-up 0.7s ease forwards', maxWidth: 580 }}>
                {/* Trust badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
                  color: '#0369a1', padding: '6px 16px', borderRadius: 100,
                  fontSize: '0.82rem', fontWeight: 600, marginBottom: 24,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 0 3px rgba(14,165,233,0.25)' }} />
                  Trusted by audio creators across Africa
                </div>

                <h1 style={{
                  fontFamily: 'Bricolage Grotesque', fontWeight: 800,
                  fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', lineHeight: 1.1,
                  color: '#0f172a', marginBottom: 24,
                }}>
                  Audio Streaming That Works —{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    Even on Poor Connections
                  </span>
                </h1>

                <p style={{ fontSize: '1.15rem', color: '#475569', lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
                  Volantislive uses ultra-low bandwidth audio streaming so your audience never misses a moment — no matter their network, no matter their data plan.
                </p>

                {/* CTAs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 36 }}>
                  <a
                    href="/signup"
                    className="cta-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                      color: 'white', padding: '14px 28px', borderRadius: 12,
                      fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
                      boxShadow: '0 4px 20px rgba(14,165,233,0.3)',
                    }}
                  >
                    Start Streaming Free <ArrowRight size={18} />
                  </a>
                  <a
                    href="/listen"
                    className="cta-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', padding: '14px 28px', borderRadius: 12,
                      fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
                      boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                    }}
                  >
                    <Headphones size={18} />
                    Listen Live Now
                  </a>
                  <a
                    href="/how-it-works"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'white', color: '#0f172a',
                      padding: '14px 28px', borderRadius: 12,
                      fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
                      border: '1.5px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Play size={16} fill="#0ea5e9" color="#0ea5e9" />
                    See How It Works
                  </a>
                </div>

                {/* Trust signals */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                  {['No credit card required', 'Free plan available', 'Setup in 5 minutes'].map(s => (
                    <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b' }}>
                      <CheckCircle size={15} color="#22c55e" fill="none" />
                      {s}
                    </span>
                  ))}
                </div>
                {/* App download banner */}
                <div style={{
                  marginTop: 32,
                  background: 'rgba(14,165,233,0.06)',
                  border: '1px solid rgba(14,165,233,0.18)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(14,165,233,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    📱
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', margin: 0 }}>
                    Get the Volantislive app
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
                    Android APK available now &middot; iOS &amp; Play Store coming soon
                    </p>
                  </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Active — APK download */}
                  <a href="https://pub-5103cbf5e90e49189df8feb43623fd78.r2.dev/app-arm64-v8a-release.apk"
                    style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    color: 'white', padding: '8px 16px', borderRadius: 10,
                    fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
                    boxShadow: '0 2px 10px rgba(14,165,233,0.25)',
                    }}
                  >
                    ⬇ Download Android APK
                  </a>

                  {/* Disabled — Play Store */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: '8px 14px', fontSize: '0.8rem', color: '#94a3b8',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}>
                    <img src="/play.png" alt="Play Store" style={{ width: 18, height: 18 }} />
                    Play Store
                    <span style={{
                    background: '#fef9c3', color: '#92400e',
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '1px 6px', borderRadius: 5,
                    }}>Soon</span>
                  </span>

                  {/* Disabled — App Store */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: '8px 14px', fontSize: '0.8rem', color: '#94a3b8',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}>
                    <img src="/apple.png" alt="App Store" style={{ width: 18, height: 18 }} />
                    App Store
                    <span style={{
                    background: '#fef9c3', color: '#92400e',
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '1px 6px', borderRadius: 5,
                    }}>Soon</span>
                  </span>
                  </div>

                  <p style={{ width: '100%', margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                  APK is in active testing — your feedback helps us improve before the full store launch.
                  </p>
                </div>
              </div>

              {/* Right: Live Card */}
              {/* <div style={{ animation: 'slide-up 0.9s ease forwards', paddingTop: 20 }}>
                <LiveBroadcastCard />
              </div> */}
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="scroll-indicator"
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: '#94a3b8', fontSize: '0.75rem',
            }}
          >
            <div style={{ width: 1, height: 30, background: 'linear-gradient(to bottom, transparent, #94a3b8)' }} />
          </div>
        </section>

        {/* ─── STATS BAR ──────────────────────────────────────────────────── */}
        {/* <div
          ref={statsSection.ref}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '40px 24px',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} index={i} trigger={statsSection.visible} />
            ))}
          </div>
        </div> */}

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