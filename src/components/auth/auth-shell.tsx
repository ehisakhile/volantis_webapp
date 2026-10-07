import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  benefits?: string[];
}

export function AuthShell({ title, description, children, benefits }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
            <span className="text-lg font-bold">Volantis<span className="text-sky-600">live</span></span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sky-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back home
          </Link>
        </div>
      </header>

      <main className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-5xl items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="hidden pt-8 lg:block">
            <p className="text-sm font-bold uppercase tracking-widest text-sky-700">Volantislive</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">A simple way to stay connected</h2>
            <p className="mt-4 leading-7 text-slate-600">Create an account, confirm your email, and continue straight to your account.</p>
            {benefits && (
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" /></span>
                    {benefit}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <section className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="auth-title">
            <div className="mb-7">
              <h1 id="auth-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-2 leading-7 text-slate-600">{description}</p>
            </div>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
