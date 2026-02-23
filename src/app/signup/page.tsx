'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Mail, Lock, User, Building2, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';

const benefits = [
  "No credit card required",
  "Free plan available forever",
  "Setup in 5 minutes",
  "Cancel anytime",
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, error: authError, clearError, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToUpdates, setAgreedToUpdates] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    setSuccessMessage('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.organization || !formData.password) {
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
      const response = await signup({
        company_name: formData.organization,
        email: formData.email,
        password: formData.password,
        user_username: `${formData.firstName.toLowerCase()}${formData.lastName.toLowerCase()}`,
      });

      // Check if email verification is required
      if (response.requires_verification) {
        setSuccessMessage(`Account created! Please check your email (${response.email}) to verify your account.`);
        // Clear form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          organization: '',
          password: '',
          confirmPassword: '',
        });
      } else if (response.access_token) {
        // Auto-login successful, redirect to dashboard
        router.push('/dashboard');
      }
    } catch {
      // Error is handled by auth context
    }
  };

  const displayError = localError || (authError ? String(authError) : '');

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

                {displayError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{displayError}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-navy-700 mb-2">
                        First Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                        <input
                          type="text"
                          id="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                          placeholder="John"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-navy-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

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

                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-navy-700 mb-2">
                      Church/Organization Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type="text"
                        id="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Grace Assembly Lagos"
                        required
                      />
                    </div>
                  </div>

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

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={agreedToUpdates}
                        onChange={(e) => setAgreedToUpdates(e.target.checked)}
                        className="mt-1 rounded border-navy-300 text-sky-500 focus:ring-sky-500" 
                      />
                      <span className="text-sm text-navy-600">
                        I agree to receive updates and communications from Volantislive
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
    </div>
  );
}
