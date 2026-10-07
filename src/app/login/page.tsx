"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/lib/auth-context";

const fieldClass = "w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error: authError, clearError, isLoading, checkEmailVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl?.startsWith("/")) sessionStorage.setItem("login_callback_url", callbackUrl);
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");
    clearError();
    if (!email.trim() || !password) return setLocalError("Enter your email and password.");

    try {
      const loggedInUser = await login({ email: email.trim(), password });
      const verified = await checkEmailVerification();
      if (!verified) return router.push("/verify-email");

      const callbackUrl = sessionStorage.getItem("login_callback_url");
      sessionStorage.removeItem("login_callback_url");
      if (callbackUrl?.startsWith("/")) return router.push(callbackUrl);
      router.push(loggedInUser.company_id ? "/dashboard" : "/user/dashboard");
    } catch {
      // The auth context exposes the user-facing error.
    }
  };

  const error = localError || (authError ? "We could not sign you in. Check your details and try again." : "");

  return (
    <AuthShell title="Welcome back" description="Sign in to continue to your account." benefits={["One login for listeners and creators", "Continue to the right account automatically", "Secure email verification"]}>
      {error && <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
          <div className="relative"><Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required className={fieldClass} /></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label><Link href="/forgot-password" className="text-sm font-semibold text-sky-700 hover:underline">Forgot password?</Link></div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className={`${fieldClass} pr-12`} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:text-slate-800">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Signing in…" : "Sign in"}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      <div className="mt-7 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
        New to Volantislive? <Link href="/signup" className="font-semibold text-sky-700 hover:underline">Create an account</Link>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading…</div>}><LoginForm /></Suspense>;
}
