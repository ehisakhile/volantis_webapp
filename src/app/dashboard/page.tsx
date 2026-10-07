"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Check, Clock, Copy, ExternalLink, Headphones, LogOut,
  Mic, Plug, Radio, Settings, TrendingUp, Upload, Users, Video, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api/client";
import { subscriptionsApi } from "@/lib/api/subscriptions";

interface Subscription {
  plan_name: string;
  plan_display_name: string;
  billing_cycle: string;
  is_active: boolean;
  subscription_end: string | null;
  daily_stream_used: number;
  daily_stream_limit: number;
  monthly_uploads_used: number;
  monthly_uploads_limit: number;
}

interface StreamStats {
  company_name: string;
  total_streams: number;
  total_streamed_time: { hours: number; minutes: number };
  subscriber_count: number;
  current_viewers: number;
  is_live: boolean;
  active_stream_title: string;
}

function formatStreamedTime(hours = 0, minutes = 0) {
  const safeHours = Math.abs(hours);
  const safeMinutes = Math.abs(minutes);
  return safeHours ? `${safeHours}h ${safeMinutes}m` : `${safeMinutes}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  const companySlug = user?.company_slug || "";

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
    else if (isAuthenticated && user && !user.company_id) router.replace("/user/dashboard");
  }, [isAuthenticated, isLoading, router, user]);

  useEffect(() => {
    if (!isAuthenticated || !user?.company_id || !companySlug) return;
    let active = true;
    setDataLoading(true);
    Promise.allSettled([
      apiClient.requestWithAuth<StreamStats>(`/subscriptions/${companySlug}/stats`),
      apiClient.requestWithAuth<Subscription>("/api/subscriptions/current"),
    ]).then(([statsResult, subscriptionResult]) => {
      if (!active) return;
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (subscriptionResult.status === "fulfilled") setSubscription(subscriptionResult.value);
      setDataLoading(false);
    });
    return () => { active = false; };
  }, [companySlug, isAuthenticated, user?.company_id]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const copyChannelLink = async () => {
    if (!companySlug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${companySlug}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel your subscription at the end of the current billing period?")) return;
    setIsCancelling(true);
    setCancelMessage("");
    try {
      const response = await subscriptionsApi.cancelSubscription();
      setCancelMessage(`Your plan will end on ${new Date(response.subscription_end_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}.`);
    } catch {
      setCancelMessage("We could not cancel your subscription. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || (isAuthenticated && user?.company_id && dataLoading)) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" aria-label="Loading dashboard" /></div>;
  }
  if (!isAuthenticated || !user?.company_id) return null;

  const statItems = [
    { label: "Total broadcasts", value: stats?.total_streams ?? 0, icon: Radio },
    { label: "Followers", value: stats?.subscriber_count ?? 0, icon: Users },
    { label: "Stream time", value: formatStreamedTime(stats?.total_streamed_time.hours, stats?.total_streamed_time.minutes), icon: Clock },
    { label: "Watching now", value: stats?.current_viewers ?? 0, icon: TrendingUp },
  ];

  const shortcuts = [
    { label: "Upload recording", description: "Publish existing audio or video", href: "/dashboard/upload-recording", icon: Upload },
    { label: "Integrations", description: "Connect playlists and services", href: "/dashboard/integrations", icon: Plug },
    { label: "Channel settings", description: "Update your channel information", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2"><img src="/logo.png" alt="Volantislive" className="h-8 w-auto" /><span className="hidden font-bold sm:inline">Creator dashboard</span></Link>
          <div className="flex items-center gap-2">
            {companySlug && <Link href={`/${companySlug}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-sky-700"><ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">View channel</span></Link>}
            <button onClick={handleLogout} aria-label="Sign out" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold text-sky-700">{stats?.company_name || user.company_name || "Your channel"}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">What would you like to do?</h1>
        </div>

        {stats?.is_live ? (
          <section className="mb-8 flex flex-col justify-between gap-5 rounded-3xl bg-emerald-600 p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><span className="h-2.5 w-2.5 rounded-full bg-white" />You are live</div><h2 className="mt-3 text-2xl font-bold">{stats.active_stream_title || "Current broadcast"}</h2><p className="mt-2 text-emerald-100">{stats.current_viewers} {stats.current_viewers === 1 ? "viewer" : "viewers"} watching now</p></div>
            <Link href="/creator/stream" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-emerald-700 hover:bg-emerald-50">Manage broadcast <ArrowRight className="h-4 w-4" /></Link>
          </section>
        ) : (
          <section className="mb-8 grid gap-4 md:grid-cols-2">
            <Link href="/creator/stream" className="group rounded-3xl bg-sky-600 p-6 text-white transition hover:bg-sky-700 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"><Mic className="h-6 w-6" /></div>
              <h2 className="mt-6 text-2xl font-bold">Start an audio broadcast</h2>
              <p className="mt-2 leading-7 text-sky-100">Best for services, radio, podcasts, and talk shows.</p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold">Set up audio <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
            <Link href="/creator/video" className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-sky-300 hover:shadow-md sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Video className="h-6 w-6" /></div>
              <h2 className="mt-6 text-2xl font-bold">Start a video broadcast</h2>
              <p className="mt-2 leading-7 text-slate-600">Use your camera or share your screen with your audience.</p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-sky-700">Set up video <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold">Channel overview</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statItems.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><Icon className="h-5 w-5 text-sky-600" /><p className="mt-4 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <section>
            <h2 className="mb-4 text-lg font-bold">Manage your channel</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {shortcuts.map(({ label, description, href, icon: Icon }) => <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-sm"><Icon className="h-5 w-5 text-sky-600" /><h3 className="mt-4 font-semibold">{label}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></Link>)}
            </div>

            {companySlug && <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Share your channel</h3><p className="mt-1 break-all text-sm text-slate-500">{origin ? `${origin}/${companySlug}` : `/${companySlug}`}</p></div><button onClick={copyChannelLink} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}</button></div></div>}
          </section>

          <aside>
            <h2 className="mb-4 text-lg font-bold">Your plan</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              {subscription ? <>
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{subscription.plan_display_name}</h3><p className="mt-1 text-sm text-slate-500">{subscription.plan_name === "free" ? "Free plan" : `${subscription.billing_cycle} billing`}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${subscription.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{subscription.is_active ? "Active" : "Inactive"}</span></div>
                {subscription.plan_name === "free" ? <Link href="/dashboard/upgrade" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 font-semibold text-white hover:bg-sky-700">View plans</Link> : subscription.is_active && <button onClick={handleCancelSubscription} disabled={isCancelling} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"><X className="h-4 w-4" />{isCancelling ? "Cancelling…" : "Cancel subscription"}</button>}
                {cancelMessage && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{cancelMessage}</p>}
              </> : <p className="text-sm text-slate-500">Plan information is unavailable.</p>}
            </div>
            <Link href="/listen" className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 hover:border-sky-300"><Headphones className="h-5 w-5 text-sky-600" />Browse live channels</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
