'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Mail, Lock, User, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';

const benefits = [
  "Follow your favorite churches and organizations",
  "Get notified when they go live",
  "Join live chat during streams",
  "Free account, no credit card required",
];

export default function UserSignupPage() {
  const router = useRouter();
  const { signupUser, error: authError, clearError, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    // Validation
    if (!formData.username || !formData.email || !formData.password) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    if (!agreedToTerms) {
      setLocalError('You must agree to the Terms of Service');
      return;
    }

    try {
      const response = await signupUser({
        email: formData.email,
        password: formData.password,
        username: formData.username,
      });

      // Check if email verification is required
      if (response.requires_verification) {
        // Store user_id and email for OTP verification, then redirect
        if (typeof window !== 'undefined') {
          localStorage.setItem('verification_email', response.email || formData.email);
          if (response.user_id) {
            localStorage.setItem('verification_user_id', String(response.user_id));
          }
        }
        // Redirect to OTP verification page
        router.push('/verify-email');
      } else if (response.access_token) {
        // Auto-login successful, redirect to user dashboard
        router.push('/user/dashboard');
      } else {
        // Store user_id and email for verification, then show success modal
        if (typeof window !== 'undefined') {
          localStorage.setItem('verification_email', response.email || formData.email);
          if (response.user?.id) {
            localStorage.setItem('verification_user_id', String(response.user.id));
          }
        }
        setSuccessEmail(response.email || formData.email);
        setShowSuccessModal(true);
      }
    } catch {
      // Error is handled by auth context
    }
  };

  const displayError = localError || (authError ? String(authError) : '');

  const handleContinueToVerify = () => {
    setShowSuccessModal(false);
    router.push('/verify-email');
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
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Benefits Side */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <h1 className="text-3xl font-bold text-navy-900 mb-6">
                  Follow your favorite creators
                </h1>
                <p className="text-lg text-navy-600 mb-8">
                  Create a free account to follow churches, organizations, and creators. Get notified when they go live and join the conversation in chat.
                </p>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-navy-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-navy-700 font-medium mb-2">Want to stream?</p>
                  <p className="text-sm text-navy-600 mb-3">Creators and organizations can start their own channels.</p>
                  <Link 
                    href="/signup" 
                    className="text-sm font-medium text-amber-600 hover:text-amber-700 underline"
                  >
                    Sign up as a creator →
                  </Link>
                </div>
              </div>
            </div>

            {/* Form Side */}
            <div>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-navy-100">
                <div className="lg:hidden mb-8">
                  <h1 className="text-2xl font-bold text-navy-900 mb-2">Create your free account</h1>
                  <p className="text-navy-600">Follow your favorite creators and get notified when they go live</p>
                </div>

                {displayError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{displayError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-navy-700 mb-2">
                      Username *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type="text"
                        id="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Choose a username"
                        required
                      />
                    </div>
                    <p className="text-xs text-navy-500 mt-1">This is how others will identify you</p>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-navy-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-12 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Create a strong password"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-navy-500 mt-1">At least 8 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                      placeholder="Confirm your password"
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 rounded border-navy-300 text-sky-500 focus:ring-sky-500" 
                        required
                      />
                      <span className="text-sm text-navy-600">
                        I agree to the <Link href="/terms" className="text-sky-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-sky-600 hover:underline">Privacy Policy</Link> *
                      </span>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    loading={isLoading}
                  >
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {}} />
          <div className="relative bg-white rounded-2xl p-8 shadow-xl max-w-md w-full mx-4 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">Account Created!</h2>
              <p className="text-navy-600 mb-2">
                Your account has been created successfully.
              </p>
              <p className="text-sm text-navy-500 mb-6">
                We've sent a verification email to <strong>{successEmail}</strong>
              </p>
              <p className="text-sm text-navy-600 mb-6">
                Please check your email and click the verification link to activate your account.
              </p>
              <Button
                onClick={handleContinueToVerify}
                size="lg"
                className="w-full"
              >
                Verify Email
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}