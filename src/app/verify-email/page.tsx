'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { CheckCircle, AlertCircle, Loader2, Mail, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  
  // Get stored email and user_id from signup
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    // Get stored email and user_id
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('verification_email');
      const storedUserId = localStorage.getItem('verification_user_id');
      
      if (storedEmail) {
        setEmail(storedEmail);
      }
      if (storedUserId) {
        setUserId(parseInt(storedUserId, 10));
      }
    }
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (!otp) {
      setStatus('error');
      setErrorMessage('Please enter the OTP code');
      return;
    }

    if (!userId) {
      setStatus('error');
      setErrorMessage('User ID not found. Please try signing up again.');
      return;
    }

    try {
      await authApi.verifyEmailWithOTP(userId, otp);
      setStatus('success');
      
      // Clear verification data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('verification_email');
        localStorage.removeItem('verification_user_id');
      }
    } catch (error: unknown) {
      setStatus('error');
      const errorMsg = error && typeof error === 'object' && 'detail' in error 
        ? String(error.detail) 
        : 'Invalid OTP code. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setResendError('Email address not found');
      setResendStatus('error');
      return;
    }

    setResendStatus('loading');
    setResendError('');

    try {
      await authApi.resendVerification(email);
      setResendStatus('success');
    } catch (error: unknown) {
      setResendStatus('error');
      const errorMsg = error && typeof error === 'object' && 'detail' in error 
        ? String(error.detail) 
        : 'Failed to resend OTP. Please try again.';
      setResendError(errorMsg);
    }
  };

  // Success state
  if (status === 'success') {
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
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-navy-900 mb-2">Email Verified!</h1>
                  <p className="text-navy-600 mb-2">
                    Your email has been successfully verified.
                  </p>
                  <p className="text-sm text-navy-500 mb-6">
                    Please login with your credentials to access your account and start streaming.
                  </p>
                  <Button onClick={() => router.push('/login')} size="lg" className="w-full">
                    Go to Login
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </main>
      </div>
    );
  }

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
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-sky-600" />
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mb-2">Verify your email</h1>
                <p className="text-navy-600">
                  We've sent a verification code to <strong>{email || 'your email'}</strong>
                </p>
              </div>

              {status === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-navy-700 mb-2">
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-navy-500 mt-2">Enter the 6-digit code from your email</p>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  loading={status === 'loading'}
                >
                  Verify Email
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </form>

              {/* Resend OTP */}
              <div className="mt-6 pt-6 border-t border-navy-100">
                {resendStatus === 'success' ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">OTP sent!</span>
                    </div>
                    <p className="text-sm text-navy-600">
                      Please check your email for a new code.
                    </p>
                  </div>
                ) : (
                  <>
                    {resendStatus === 'error' && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{resendError}</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-sm text-navy-600 mb-3">
                        Didn't receive the code?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendOtp}
                        loading={resendStatus === 'loading'}
                        disabled={!email}
                      >
                        Resend OTP
                      </Button>
                    </div>
                  </>
                )}
              </div>

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
