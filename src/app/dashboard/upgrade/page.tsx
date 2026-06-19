'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { subscriptionsApi, UserCoupon, CouponValidationResponse } from '@/lib/api/subscriptions';
import { formatNaira } from '@/lib/utils';
import {
  ArrowLeft, Check, X, Crown, Zap, Loader2,
  CheckCircle2, XCircle, AlertCircle, Tag, Gift, Ticket
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
      { name: 'Unlimited Streaming', included: true },
      { name: '150 uploads/month', included: true },
      { name: 'Full analytics', included: true },
      { name: '1 integration', included: true },
      { name: 'Custom channel page', included: true },
      { name: 'Embeddable player', included: true },
      { name: 'Email support', included: true },
      
      { name: 'Donations', included: false },
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
      { name: 'Unlimited Streaming', included: true },
      { name: '300 uploads/month', included: true },
      { name: 'Full analytics', included: true },
      { name: '1 integration', included: true },
      { name: 'Custom channel page', included: true },
      { name: 'Embeddable player', included: true },
      { name: 'Email support', included: true },
      {name: 'Stream Scheduling', included: true},
      { name: 'Donations', included: true },
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
      { name: 'Unlimited Streaming', included: true },
      { name: 'Unlimited uploads', included: true },
      { name: 'Full analytics', included: true },
      { name: '1 integration', included: true },
      { name: 'Custom channel page', included: true },
      { name: 'Embeddable player', included: true },
      { name: 'Priority support (WhatsApp)', included: true },
      {name: 'Stream Scheduling', included: true},
      { name: 'Donations', included: true },
      { name: 'Remove Volantislive branding', included: true },
      {name: 'Developer API Access', included: true},
      {name: 'Dedicated Account Manager', included: true}
    ],
  },
];

// Payment status view after redirect
type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

// Checkout view state
type CheckoutView = 'plans' | 'checkout';

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
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<UserCoupon | null>(null);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);
  const [checkoutView, setCheckoutView] = useState<CheckoutView>('plans');
  const [manualCouponInput, setManualCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponValidationError, setCouponValidationError] = useState<string | null>(null);
  const [manualCouponCode, setManualCouponCode] = useState<string | null>(null);
  const [couponValidations, setCouponValidations] = useState<Record<number, CouponValidationResponse>>({});
  const [showCouponInput, setShowCouponInput] = useState(false);
  
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

  // Fetch user coupons on mount
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const userCoupons = await subscriptionsApi.getMyCoupons();
        setCoupons(userCoupons);
      } catch (err) {
        console.error('Failed to fetch coupons:', err);
      } finally {
        setIsLoadingCoupons(false);
      }
    };
    
    if (isAuthenticated && !authLoading) {
      fetchCoupons();
    }
  }, [isAuthenticated, authLoading]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    setSelectedPlan(plan);
    setError(null);
    
    // Check if user has a coupon applicable to this plan
    const applicableCoupon = coupons.find(coupon => {
      const couponPlanLower = coupon.applicable_plans.toLowerCase();
      return couponPlanLower === plan.name.toLowerCase() || couponPlanLower === 'all';
    });
    
    // Check if user has a manually applied coupon
    if (applicableCoupon) {
      setAppliedCoupon(applicableCoupon);
      setCheckoutView('checkout');
    } else if (manualCouponCode && couponValidations[plan.id]?.valid) {
      // User has manually entered a valid coupon for this specific plan, go to checkout
      setCheckoutView('checkout');
    } else {
      // No coupon available, proceed directly to checkout
      await initiateCheckout(plan, '');
    }
  };

  const handleValidateManualCoupon = async () => {
    if (!manualCouponInput.trim()) {
      setCouponValidationError('Please enter a coupon code');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponValidationError(null);
    setManualCouponCode(manualCouponInput.trim().toUpperCase());
    setCouponValidations({});

    try {
      const validations: Record<number, CouponValidationResponse> = {};
      const validationPromises = plans.map(async (plan) => {
        try {
          const validation = await subscriptionsApi.validateCoupon(manualCouponInput.trim(), plan.id);
          validations[plan.id] = validation;
        } catch {
          validations[plan.id] = { valid: false, coupon_type: '', discount_type: '', discount_percentage: 0, discount_amount_kobo: null, new_price_kobo: plan.monthlyPrice, is_100_percent: false, monthly_uses_remaining: null, message: 'Validation failed' };
        }
      });

      await Promise.all(validationPromises);
      setCouponValidations(validations);

      const anyValid = Object.values(validations).some(v => v.valid);
      if (!anyValid) {
        setCouponValidationError('This coupon is not valid for any available plan');
        setManualCouponCode(null);
      } else {
        setShowCouponInput(false);
        setManualCouponInput('');
      }
    } catch (err) {
      console.error('Coupon validation failed:', err);
      setCouponValidationError('Failed to validate coupon. Please try again.');
      setManualCouponCode(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleClearManualCoupon = () => {
    setManualCouponCode(null);
    setCouponValidations({});
    setManualCouponInput('');
    setCouponValidationError(null);
  };

  const handleProceedToCheckout = async () => {
    if (selectedPlan && manualCouponCode) {
      await initiateCheckout(selectedPlan, manualCouponCode);
    }
  };

  const initiateCheckout = async (plan: PlanConfig, couponCode: string) => {
    setIsProcessing(true);
    try {
      const checkoutData = {
        plan_id: plan.id,
        billing_cycle: billingCycle,
        coupon_code: couponCode,
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

  const handleSkipCoupon = async () => {
    if (selectedPlan) {
      setCheckoutView('plans');
      setAppliedCoupon(null);
      setManualCouponCode(null);
      setCouponValidations({});
      await initiateCheckout(selectedPlan, '');
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

  // Calculate discounted price for a specific plan
  const calculateDiscountedPrice = (planId: number, originalPrice: number): number => {
    if (appliedCoupon) {
      if (appliedCoupon.is_100_percent) return 0;
      return Math.round(originalPrice * (1 - appliedCoupon.discount_percentage / 100));
    }
    if (manualCouponCode && couponValidations[planId]?.valid) {
      const validation = couponValidations[planId];
      if (validation.is_100_percent) return 0;
      return validation.new_price_kobo/100;
    }
    return originalPrice;
  };

  // Get the selected plan price based on billing cycle
  const getSelectedPlanPrice = (): number => {
    if (!selectedPlan) return 0;
    return billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice;
  };

  const getOriginalPriceDisplay = (): string => {
    if (!selectedPlan) return '';
    return billingCycle === 'monthly' ? selectedPlan.priceDisplay : selectedPlan.annualPriceDisplay;
  };

  const getDiscountedPriceDisplay = (): string => {
    if (!selectedPlan) return '';
    const discounted = calculateDiscountedPrice(selectedPlan.id, getSelectedPlanPrice());
    return formatNaira(discounted);
  };

  const getSavingsDisplay = (): string => {
    if (!selectedPlan) return '';
    const discountPercent = appliedCoupon?.discount_percentage || couponValidations[selectedPlan.id]?.discount_percentage;
    const isFree = appliedCoupon?.is_100_percent || couponValidations[selectedPlan.id]?.is_100_percent;
    if (!discountPercent || isFree) return '';
    const original = getSelectedPlanPrice();
    const discounted = calculateDiscountedPrice(selectedPlan.id, original);
    const savings = original - discounted;
    return formatNaira(savings);
  };

  const getActiveCouponDisplay = () => {
    if (appliedCoupon) {
      return { code: appliedCoupon.code, isPercent: true, percent: appliedCoupon.discount_percentage, is100: appliedCoupon.is_100_percent };
    }
    if (manualCouponCode && selectedPlan && couponValidations[selectedPlan.id]?.valid) {
      const validation = couponValidations[selectedPlan.id];
      return { code: manualCouponCode, isPercent: validation.discount_type === 'percentage', percent: validation.discount_percentage, is100: validation.is_100_percent };
    }
    return null;
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

  // Show checkout confirmation view
  if (checkoutView === 'checkout' && selectedPlan && (appliedCoupon || (manualCouponCode && couponValidations[selectedPlan.id]?.valid))) {
    const validation = couponValidations[selectedPlan.id];
    const isFree = appliedCoupon?.is_100_percent || validation?.is_100_percent || false;
    const discountPercent = appliedCoupon?.discount_percentage || validation?.discount_percentage || 0;
    const discountedPrice = calculateDiscountedPrice(selectedPlan.id, getSelectedPlanPrice());
    const activeCouponCode = appliedCoupon?.code || manualCouponCode || '';
    
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <Container>
            <div className="flex items-center justify-between h-16">
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
              </Link>
              <button
                onClick={() => {
                  setCheckoutView('plans');
                  setAppliedCoupon(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-sky-600"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Plans
              </button>
            </div>
          </Container>
        </header>

        <main className="py-12">
          <Container>
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    You're using a coupon!
                  </h2>
                  <p className="text-slate-600">
                    Your discount has been applied to your subscription
                  </p>
                </div>

                <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                        <Tag className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Coupon Code</p>
                        <p className="font-semibold text-slate-900">{activeCouponCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {isFree ? 'FREE' : `${discountPercent}% OFF`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Plan</span>
                    <span className="font-medium text-slate-900">{selectedPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Billing Cycle</span>
                    <span className="font-medium text-slate-900 capitalize">{billingCycle}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Original Price</span>
                    <span className="font-medium text-slate-500 line-through">{getOriginalPriceDisplay()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Discount</span>
                    <span className="font-medium text-green-600">
                      {isFree ? '100%' : `${discountPercent}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 bg-slate-50 rounded-lg px-3">
                    <span className="font-semibold text-slate-900">Final Price</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {isFree ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        getDiscountedPriceDisplay()
                      )}
                    </span>
                  </div>
                  {!isFree && (
                    <div className="flex items-center justify-center gap-1 text-sm text-green-600 font-medium">
                      <Check className="w-4 h-4" />
                      You save {getSavingsDisplay()}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {isFree ? (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleProceedToCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Activate Free Subscription'
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleProceedToCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Pay ${getDiscountedPriceDisplay()}`
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSkipCoupon}
                    disabled={isProcessing}
                  >
                    Skip Coupon & Pay Full Price
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center mt-4">
                  By proceeding, you agree to our{' '}
                  <Link href="/terms-of-service" className="text-sky-600 hover:underline">
                    Terms of Service
                  </Link>
                </p>
              </div>
            </div>
          </Container>
        </main>
      </div>
    );
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
          {/* <div className="flex justify-center mb-8">
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
          </div> */}

          {/* Manual Coupon Input Section */}
          {!manualCouponCode && (
            <div className="max-w-md mx-auto mb-8">
              {showCouponInput ? (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={manualCouponInput}
                          onChange={(e) => {
                            setManualCouponInput(e.target.value.toUpperCase());
                            setCouponValidationError(null);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleValidateManualCoupon();
                            }
                          }}
                        />
                      </div>
                      {couponValidationError && (
                        <p className="text-xs text-red-500 mt-1.5">{couponValidationError}</p>
                      )}
                    </div>
                    {plans.length > 0 && (() => {
                      return (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleValidateManualCoupon}
                            disabled={isValidatingCoupon || !manualCouponInput.trim()}
                          >
                            {isValidatingCoupon ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowCouponInput(false);
                              setManualCouponInput('');
                              setCouponValidationError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCouponInput(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-sky-600 transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  Have a coupon code?
                </button>
              )}
            </div>
          )}

          {/* Applied Manual Coupon Banner */}
          {manualCouponCode && Object.keys(couponValidations).length > 0 && (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Tag className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Coupon Applied</p>
                      <p className="font-semibold text-slate-900">{manualCouponCode}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearManualCoupon}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove coupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Valid for: {plans.filter(plan => couponValidations[plan.id]?.valid).map(p => p.name).join(', ') || 'No plans'}
                </p>
              </div>
            </div>
          )}

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
                  {(() => {
                    const planPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                    const originalDisplay = billingCycle === 'monthly' ? plan.priceDisplay : plan.annualPriceDisplay;
                    const couponValidation = couponValidations[plan.id];
                    const hasAssignedCoupon = !isLoadingCoupons && coupons.some(
                      c => c.applicable_plans.toLowerCase() === plan.name.toLowerCase() || c.applicable_plans.toLowerCase() === 'all'
                    );
                    const hasManualCoupon = manualCouponCode && couponValidation?.valid;

                    if (hasManualCoupon) {
                      const discountedPrice = billingCycle === 'monthly' 
                        ? couponValidation.new_price_kobo/100 
                        : Math.round(couponValidation.new_price_kobo * 10);
                      return (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-green-600">
                              {formatNaira(discountedPrice)}
                            </span>
                            <span className="text-slate-500 text-sm">
                              /{billingCycle === 'monthly' ? plan.period : 'year'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-through mt-0.5">{originalDisplay}</p>
                          <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {manualCouponCode}: {couponValidation.is_100_percent ? 'FREE' : `${couponValidation.discount_percentage}% OFF`}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <span className="text-3xl font-bold text-slate-900">{originalDisplay}</span>
                        <span className="text-slate-500 text-sm">
                          /{billingCycle === 'monthly' ? plan.period : 'year'}
                        </span>
                        {hasAssignedCoupon && (
                          <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Coupon available!
                          </p>
                        )}
                        {!hasAssignedCoupon && billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            Save 2 months with annual billing
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className="w-full mb-6"
                  disabled={isProcessing && selectedPlan?.id === plan.id}
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
