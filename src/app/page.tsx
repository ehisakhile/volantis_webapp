import Link from "next/link";
import { ArrowRight, Check, Headphones, Radio, Share2, Signal, Smartphone, Users, Wifi } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const benefits = [
  { icon: Wifi, title: "Works on weak networks", description: "Audio-first streaming uses less data and stays accessible on slower mobile connections." },
  { icon: Smartphone, title: "Start from your browser", description: "Create your broadcast, choose your source, and go live without complicated equipment." },
  { icon: Share2, title: "One link for your audience", description: "Share your channel so listeners can join live broadcasts and find past recordings." },
];

const steps = [
  { number: "01", title: "Create your channel", description: "Set up your account and add your channel details." },
  { number: "02", title: "Start your broadcast", description: "Choose audio or video, add a title, and go live from your device." },
  { number: "03", title: "Share and connect", description: "Send your link so your audience can listen, watch, and chat." },
];

const useCases = ["Churches", "Community radio", "Podcasters", "Educators", "Musicians", "Talk shows"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 px-4 pb-20 pt-32 sm:px-6 sm:pb-24 sm:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_36%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-700">
                <Signal className="h-4 w-4" aria-hidden="true" />
                Live streaming built for African networks
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Go live. Reach your audience anywhere.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Volantislive helps churches, creators, and community stations broadcast live audio and video—even when internet connections are slow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700">
                  Start streaming free <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/listen" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:border-sky-300 hover:text-sky-700">
                  <Headphones className="h-4 w-4" aria-hidden="true" /> Listen to live streams
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                {["No credit card required", "Easy browser setup", "Available on mobile"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />{item}</span>
                ))}
              </div>
              <div className="mt-8 border-t border-slate-200 pt-6">
                <p className="mb-3 text-sm font-semibold text-slate-700">Get the Volantislive mobile app</p>
                <div className="flex flex-col gap-3 min-[420px]:flex-row">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.volantislive.volantislive"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download Volantislive on Google Play"
                    className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-slate-950 px-4 py-2.5 text-white transition hover:bg-slate-800"
                  >
                    <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.2 23.8c.3.2.7.2 1 .1l11.4-6.6-2.5-2.5-9.9 9Z" fill="#34A853" />
                      <path d="M.5 1.4A1.5 1.5 0 0 0 0 2.5v19c0 .5.2.9.5 1.2l.1.1L13.1 12v-.3L.6 1.3l-.1.1Z" fill="#4285F4" />
                      <path d="m19.8 10.1-3.2-1.9-2.9 2.8 2.9 2.9 3.2-1.9c.8-.5.8-1.5 0-1.9Z" fill="#FBBC04" />
                      <path d="M4.2.1 15.6 6.7l-2.5 2.5L3.2.3c.3-.1.7-.1 1 .1Z" fill="#EA4335" />
                    </svg>
                    <span className="text-left"><span className="block text-[10px] leading-none text-slate-300">GET IT ON</span><span className="mt-1 block font-semibold leading-none">Google Play</span></span>
                  </a>
                  <a
                    href="https://apps.apple.com/us/app/volantislive/id6762115839"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download Volantislive on the App Store"
                    className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-slate-950 px-4 py-2.5 text-white transition hover:bg-slate-800"
                  >
                    <svg className="h-7 w-7 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.7 19.5c-.8 1.2-1.7 2.5-3 2.5s-1.8-.8-3.3-.8-2 .8-3.3.8c-1.3.1-2.3-1.3-3.1-2.5C4.3 17 2.9 12.5 4.7 9.4c.9-1.5 2.4-2.5 4.1-2.5 1.3 0 2.5.9 3.3.9s2.3-1.1 3.8-.9c.7 0 2.5.3 3.7 2-.1.1-2.2 1.3-2.2 3.8 0 3 2.7 4 2.7 4s-.4 1.4-1.4 2.8ZM13 3.5C13.7 2.7 14.9 2 15.9 2c.1 1.2-.3 2.4-1 3.2-.7.9-1.8 1.5-3 1.4-.1-1.1.5-2.3 1.1-3.1Z" /></svg>
                    <span className="text-left"><span className="block text-[10px] leading-none text-slate-300">DOWNLOAD ON THE</span><span className="mt-1 block font-semibold leading-none">App Store</span></span>
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-sky-950/5 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Radio className="h-5 w-5" aria-hidden="true" /></div>
                  <div><p className="font-semibold text-slate-900">Sunday Service</p><p className="text-sm text-slate-500">Your channel</p></div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700"><span className="h-2 w-2 rounded-full bg-red-500" />Live</span>
              </div>
              <div className="my-8 flex h-32 items-end justify-center gap-1.5 rounded-2xl bg-slate-950 px-6 py-7" aria-label="Live audio broadcast preview">
                {[38, 62, 44, 76, 52, 88, 64, 42, 72, 56, 82, 46, 68, 36].map((height, index) => (
                  <span key={index} className="w-2 rounded-full bg-sky-400" style={{ height: `${height}%`, opacity: 0.55 + (index % 4) * 0.12 }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4"><Users className="mb-3 h-5 w-5 text-sky-600" aria-hidden="true" /><p className="text-sm font-semibold">Audience ready</p><p className="mt-1 text-xs leading-5 text-slate-500">Listeners join with your link.</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><Smartphone className="mb-3 h-5 w-5 text-emerald-600" aria-hidden="true" /><p className="text-sm font-semibold">Listen anywhere</p><p className="mt-1 text-xs leading-5 text-slate-500">Join from the web or mobile app.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-sky-700">Why Volantislive</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple streaming for real-world connections</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">Everything you need to broadcast and stay connected, without a complicated setup.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border border-slate-200 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-sky-400">How it works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From setup to live in three steps</h2>
              <p className="mt-4 leading-7 text-slate-400">You do not need specialist streaming knowledge. The setup stays short and clear.</p>
              <Link href="/how-it-works" className="mt-7 inline-flex items-center gap-2 font-semibold text-sky-400 hover:text-sky-300">See how it works <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            <ol className="grid gap-4">
              {steps.map((step) => (
                <li key={step.number} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:gap-6 sm:p-6">
                  <span className="font-mono text-sm font-bold text-sky-400">{step.number}</span>
                  <div><h3 className="text-lg font-semibold">{step.title}</h3><p className="mt-2 leading-7 text-slate-400">{step.description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-sky-700">Made for your community</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One platform, many voices</h2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {useCases.map((item) => <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 font-medium text-slate-700">{item}</span>)}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl rounded-3xl bg-sky-600 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to reach your audience?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-sky-100">Create your channel and start your first broadcast with a setup built to stay simple.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-sky-700 transition hover:bg-sky-50">Start streaming free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-sky-400 px-6 py-3 font-semibold text-white transition hover:bg-sky-700">View pricing</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
