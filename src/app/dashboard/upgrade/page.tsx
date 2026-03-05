'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { formatNaira } from '@/lib/utils';
import {
  ArrowLeft, Check, X, Crown, Zap, Loader2,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

// Plan configuration - matching pricing page
interface PlanConfig {
  id: number;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  priceDisplay: string;
  annualPriceDisplay: string;
  period: string;
  popular: boolean;
  features: { name: string; included: boolean }[];
}

const plans: PlanConfig[] = [
  {
    id: 2,
    name: 'Starter',
    description: 'For small teams and growing communities',
    monthlyPrice: 15000,
    annualPrice: 150000,
    priceDisplay: formatNaira(15000),
    annualPriceDisplay: formatNaira(150000),
    period: 'month',
    popular: false,
    features: [
      { name: '5 hours stream/day', included: true },
      { name: '150 uploads/month', included: true },
      { name: 'Full analytics', included: true },
      { name: '1 integration', included: true },
      { name: 'Custom channel page', included: true },
      { name: 'Embeddable player', included: true },
      { name: 'Email support', included: true },
      { name: 'Priority support', included: false },
    ],
  },
  {
    id: 3,
    name: 'Pro',
    description: 'For professional broadcasters and organisations',
    monthlyPrice: 60000,
    annualPrice: 600000,
    priceDisplay: formatNaira(60000),
    annualPriceDisplay: formatNaira(600000),
    period: 'month',
    popular: true,
    features: [
      { name: '10 hours stream/day', included: true },
      { name: 'Unlimited uploads', included: true },
      { name: 'Full analytics', included: true },
      { name: '1 integration', included: true },
      { name: 'Custom channel page', included: true },
      { name: 'Embeddable player', included: true },
      { name: 'Email support', included: true },
      { name: 'Priority support', included: false },
    ],
  },
  {
    id: 4,
    name: 'Enterprise',
    description: 'For large organisations with maximum scale',
    monthlyPrice: 150000,
    annualPrice: 1500000,
    priceDisplay: formatNaira(150000),
    annualPriceDisplay: formatNaira(1500000),
    period: 'month',
    popular: false,
    features: [
      { name: '24 hours stream/day', included: true },
      { name: 'Unlimited uploads', included: true },
      { name: 'Full analytics', included: true },
      { name: '1 integration', included: true },
      { name: 'Custom channel page', included: true },
      { name: 'Embeddable player', included: true },
      { name: 'Priority support (WhatsApp)', included: true },
      { name: 'Remove Volantislive branding', included: true },
    ],
  },
];

// Payment status view after redirect
type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    }>
      <UpgradePageContent />
    </Suspense>
  );
}

function UpgradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Check for payment verification on page load
  const reference = searchParams.get('reference');
  const status = searchParams.get('status');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle payment verification after redirect from Paystack
  useEffect(() => {
    if (reference && status) {
      verifyPayment(reference);
    }
  }, [reference, status]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    setSelectedPlan(plan);
    setError(null);
    
    // Initiate checkout
    setIsProcessing(true);
    try {
      const checkoutData = {
        plan_id: plan.id,
        billing_cycle: billingCycle,
        coupon_code: '',
        additional_integrations: 0,
      };

      const response = await subscriptionsApi.createCheckout(checkoutData);
      
      // Redirect to Paystack checkout
      window.location.href = response.authorization_url;
    } catch (err: unknown) {
      console.error('Checkout failed:', err);
      setError('Failed to initiate checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (ref: string) => {
    setPaymentStatus('processing');
    setError(null);
    
    try {
      const response = await subscriptionsApi.verifyPayment(ref);
      
      if (response.success) {
        setPaymentStatus('success');
        // Refresh the page after 2 seconds to show updated subscription
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setPaymentStatus('failed');
        setError(response.message || 'Payment verification failed');
      }
    } catch (err: unknown) {
      console.error('Payment verification failed:', err);
      setPaymentStatus('failed');
      setError('Failed to verify payment. Please contact support.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show payment result status
  if (paymentStatus !== 'idle') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <Container>
            <div className="flex items-center justify-between h-16">
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-sky-600"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </Container>
        </header>

        <main className="py-16">
          <Container>
            <div className="max-w-md mx-auto">
              {paymentStatus === 'processing' && (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
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
              )}

              {paymentStatus === 'success' && (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Payment Successful!
                  </h2>
                  <p className="text-slate-600">
                    Your subscription has been upgraded. Redirecting to dashboard...
                  </p>
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
                  <p className="text-slate-600 mb-4">
                    {error || 'Your payment could not be verified. Please try again.'}
                  </p>
                  <Link
                    href="/dashboard/upgrade"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600"
                  >
                    Try Again
                  </Link>
                </div>
              )}
            </div>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-sky-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <Container>
          {/* Header Section */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Upgrade Your Plan
            </h1>
            <p className="text-lg text-slate-600">
              Choose the plan that best fits your needs and unlock more features
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-xl p-1.5 border border-slate-200 inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                  plan.popular
                    ? 'ring-2 ring-sky-500 shadow-xl'
                    : 'border border-slate-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-slate-500 text-sm">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">
                      {billingCycle === 'monthly' 
                        ? plan.priceDisplay 
                        : plan.annualPriceDisplay
                      }
                    </span>
                    <span className="text-slate-500 text-sm">
                      /{billingCycle === 'monthly' ? plan.period : 'year'}
                    </span>
                  </div>
                  {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Save 2 months with annual billing
                    </p>
                  )}
                </div>

                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className="w-full mb-6"
                  disabled={isProcessing}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isProcessing && selectedPlan?.id === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Select Plan'
                  )}
                </Button>

                <ul className="space-y-2.5 mt-auto">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-slate-500 mt-8">
            Need help choosing?{' '}
            <Link href="/contact" className="text-sky-600 hover:underline font-medium">
              Contact our team
            </Link>
          </p>
        </Container>
      </main>
    </div>
  );
}
