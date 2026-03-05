'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle, Home
} from 'lucide-react';

type PaymentStatus = 'processing' | 'success' | 'failed';

export default function VerifySubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('processing');
  const [error, setError] = useState<string | null>(null);

  // Get reference from query params
  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && reference) {
      verifyPayment(reference);
    } else if (isAuthenticated && !reference) {
      // No reference, redirect to upgrade page
      router.push('/dashboard/upgrade');
    }
  }, [isAuthenticated, authLoading, router, reference]);

  const verifyPayment = async (ref: string) => {
    setPaymentStatus('processing');
    setError(null);
    
    try {
      const response = await subscriptionsApi.verifyPayment(ref);
      
      if (response.success) {
        setPaymentStatus('success');
        // Refresh the page after 3 seconds to show updated subscription
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setPaymentStatus('failed');
        setError(response.message || 'Payment verification failed');
      }
    } catch (err: unknown) {
      console.error('Payment verification failed:', err);
      setPaymentStatus('failed');
      setError('Failed to verify payment. Please contact support if this issue persists.');
    }
  };

  if (authLoading || paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Verifying Payment...
          </h2>
          <p className="text-slate-600">
            Please wait while we verify your payment.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
            </Link>
          </div>
        </Container>
      </header>

      <main className="py-16">
        <Container>
          <div className="max-w-md mx-auto">
            {paymentStatus === 'success' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Payment Successful!
                </h2>
                <p className="text-slate-600 mb-6">
                  Your subscription has been upgraded successfully. Redirecting to your dashboard...
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Link>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Payment Failed
                </h2>
                <p className="text-slate-600 mb-2">
                  {error || 'Your payment could not be verified. Please try again.'}
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Reference: {reference}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/dashboard/upgrade"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Try Again
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Contact Support
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
