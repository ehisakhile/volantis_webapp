'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    const verifyEmail = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
      } catch (error: unknown) {
        setStatus('error');
        const errorMsg = error && typeof error === 'object' && 'detail' in error 
          ? String(error.detail) 
          : 'Verification failed. The link may have expired.';
        setErrorMessage(errorMsg);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-navy-100">
      {status === 'loading' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Verifying your email</h1>
          <p className="text-navy-600">Please wait while we verify your email address...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Email verified!</h1>
          <p className="text-navy-600 mb-6">
            Your email has been successfully verified. You can now access your account.
          </p>
          <Button onClick={() => router.push('/login')} size="lg" className="w-full">
            Go to Login
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Verification failed</h1>
          <p className="text-navy-600 mb-6">{errorMessage}</p>
          
          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button size="lg" className="w-full">
                Go to Login
              </Button>
            </Link>
            <Link href="/signup" className="block">
              <Button variant="outline" size="lg" className="w-full">
                Create New Account
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
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
            <Suspense fallback={
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-navy-100">
                <div className="text-center">
                  <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                  </div>
                  <h1 className="text-2xl font-bold text-navy-900 mb-2">Loading...</h1>
                </div>
              </div>
            }>
              <VerifyEmailContent />
            </Suspense>
          </div>
        </Container>
      </main>
    </div>
  );
}
