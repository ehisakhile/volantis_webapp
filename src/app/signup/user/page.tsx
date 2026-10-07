"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Headphones, Lock, Mail, Radio, User } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/lib/auth-context";

const fieldClass = "w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

export default function UserSignupPage() {
  const router = useRouter();
  const { signupUser, error: authError, clearError, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError("");
    clearError();
    if (password.length < 8) return setLocalError("Use at least 8 characters for your password.");
    if (!agreed) return setLocalError("Agree to the Terms and Privacy Policy to continue.");
    try {
      const response = await signupUser({ username: username.trim(), email: email.trim(), password });
      if (response.requires_verification || !response.access_token) {
        localStorage.setItem("verification_email", response.email || email.trim());
        const userId = response.user_id || response.user?.id;
        if (userId) localStorage.setItem("verification_user_id", String(userId));
        router.push("/verify-email");
      } else router.push("/user/dashboard");
    } catch {
      // The auth context exposes the user-facing error.
    }
  };

  const error = localError || (authError ? String(authError) : "");
  return (
    <AuthShell title="Create a listener account" description="Follow channels and join live conversations." benefits={["Follow your favourite channels", "Join live chat", "Free listener account"]}>
      <div className="mb-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Choose account type">
        <Link href="/signup" className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><Radio className="h-4 w-4" aria-hidden="true" />I want to stream</Link>
        <span className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-sky-700 shadow-sm"><Headphones className="h-4 w-4" aria-hidden="true" />I want to listen</span>
      </div>
      {error && <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div><label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">Display name</label><div className="relative"><User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" placeholder="How people will see you" className={fieldClass} /></div></div>
        <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email address</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" className={fieldClass} /></div></div>
        <div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className={`${fieldClass} pr-12`} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-600"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600" /><span>I agree to the <Link href="/terms-of-service" className="font-semibold text-sky-700 hover:underline">Terms of Service</Link> and <Link href="/privacy-policy" className="font-semibold text-sky-700 hover:underline">Privacy Policy</Link>.</span></label>
        <button type="submit" disabled={isLoading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">{isLoading ? "Creating account…" : "Create listener account"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </form>
      <p className="mt-7 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-sky-700 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
