'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { ArrowRight, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (!email) {
      setStatus('error');
      setErrorMessage('Please enter your email address');
      return;
    }

    try {
      await authApi.resendVerification(email);
      setStatus('success');
    } catch (error: unknown) {
      setStatus('error');
      const errorMsg = error && typeof error === 'object' && 'detail' in error 
        ? String(error.detail) 
        : 'Failed to resend verification email. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-navy-100 py-4">
        <Container>
          <Link href="/" className="flex items-center gap-2 w-fit">
            <img
              src="/logo.png"
              alt="Volantislive"
              className="h-8 w-auto"
            />
          </Link>
        </Container>
      </header>

      <main className="py-16">
        <Container>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-navy-100">
              {status === 'success' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-navy-900 mb-2">Verification code sent!</h1>
                  <p className="text-navy-600 mb-2">
                    We've sent a verification code to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-navy-500 mb-6">
                    Please check your email and enter the OTP code to activate your account.
                  </p>
                  <Link href="/verify-email" className="block">
                    <Button size="lg" className="w-full">
                      Go to Verify Email
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-sky-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-navy-900 mb-2">Resend verification code</h1>
                    <p className="text-navy-600">
                      Enter your email address and we'll resend the OTP code.
                    </p>
                  </div>

                  {status === 'error' && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                          placeholder="you@example.com"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      loading={status === 'loading'}
                    >
                      Resend OTP Code
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </form>

                 
                </>
              )}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
