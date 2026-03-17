'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.requestPasswordReset(email);
      setSuccess(true);
      
      // Store email in sessionStorage for the reset page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reset_email', email);
      }
      
      // Redirect to reset page after a brief delay
      setTimeout(() => {
        router.push('/forgot-password/reset');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? String(err.detail)
        : 'Failed to send reset code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-navy-100 py-4">
        <Container>
          <Link href="/login" className="flex items-center gap-2 w-fit">
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
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-navy-900 mb-2">
                  {success ? 'Check your email' : 'Forgot password?'}
                </h1>
                <p className="text-navy-600">
                  {success 
                    ? 'We sent a password reset code to your email'
                    : 'Enter your email address and we will send you a code to reset your password'
                  }
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">
                    Password reset code sent! Redirecting you to enter the code...
                  </p>
                </div>
              )}

              {!success && (
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
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    loading={isLoading}
                  >
                    Send Reset Code
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-navy-600">
                  Remember your password?{" "}
                  <Link href="/login" className="text-sky-600 font-medium hover:underline">
                    Login
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
