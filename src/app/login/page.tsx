import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Login - Volantislive",
  description: "Login to your Volantislive account.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-navy-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-navy-100 py-4">
        <Container>
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-lg font-bold text-navy-900">Volantislive</span>
          </Link>
        </Container>
      </header>

      <main className="py-16">
        <Container>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-navy-100">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-navy-900 mb-2">Welcome back</h1>
                <p className="text-navy-600">Login to your account to continue</p>
              </div>

              <form className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                    <input
                      type="email"
                      id="email"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-navy-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                    <input
                      type="password"
                      id="password"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-navy-300 text-sky-500 focus:ring-sky-500" />
                    <span className="text-sm text-navy-600">Remember me</span>
                  </label>
                  <Link href="/contact" className="text-sm text-sky-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Login
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-navy-600">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-sky-600 font-medium hover:underline">
                    Sign up free
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
