import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Lock, User, Building2, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign Up - Volantislive",
  description: "Create your free Volantislive account and start streaming.",
};

const benefits = [
  "No credit card required",
  "Free plan available forever",
  "Setup in 5 minutes",
  "Cancel anytime",
];

export default function SignupPage() {
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
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Benefits Side */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <h1 className="text-3xl font-bold text-navy-900 mb-6">
                  Start streaming today
                </h1>
                <p className="text-lg text-navy-600 mb-8">
                  Join 500+ churches and organizations already reaching their audience with Volantislive.
                </p>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-navy-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-6 bg-sky-50 rounded-xl">
                  <p className="text-navy-700 font-medium mb-2">"We went from 0 to 500+ online listeners in 2 months. Volantislive changed everything for us."</p>
                  <p className="text-sm text-navy-500">— Pastor Emmanuel, Grace Assembly Lagos</p>
                </div>
              </div>
            </div>

            {/* Form Side */}
            <div>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-navy-100">
                <div className="lg:hidden mb-8">
                  <h1 className="text-2xl font-bold text-navy-900 mb-2">Start streaming today</h1>
                  <p className="text-navy-600">Create your free account</p>
                </div>

                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-navy-700 mb-2">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                        <input
                          type="text"
                          id="firstName"
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                          placeholder="John"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-navy-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

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
                    <label htmlFor="organization" className="block text-sm font-medium text-navy-700 mb-2">
                      Church/Organization Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type="text"
                        id="organization"
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                        placeholder="Grace Assembly Lagos"
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
                        placeholder="Create a strong password"
                      />
                    </div>
                    <p className="text-xs text-navy-500 mt-1">At least 8 characters</p>
                  </div>

                  <div>
                    <label className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 rounded border-navy-300 text-sky-500 focus:ring-sky-500" />
                      <span className="text-sm text-navy-600">
                        I agree to receive updates and communications from Volantislive
                      </span>
                    </label>
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Create Free Account
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-navy-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-sky-600 font-medium hover:underline">
                      Login
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
