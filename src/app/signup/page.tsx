'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Mail, Lock, User, Building2, CheckCircle, Eye, EyeOff, AlertCircle, Globe, FileImage } from 'lucide-react';

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
    organizationSlug: '',
    organizationDescription: '',
    password: '',
    confirmPassword: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToUpdates, setAgreedToUpdates] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

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
        company_slug: formData.organizationSlug || null,
        company_description: formData.organizationDescription || null,
        email: formData.email,
        user_username: `${formData.firstName.toLowerCase()}_${formData.lastName.toLowerCase()}`,
        password: formData.password,
        logo: logoFile,
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
        // Auto-login successful, redirect to dashboard
        router.push('/dashboard');
      } else {
        // Store user_id and email for verification, then show success modal
        if (typeof window !== 'undefined') {
          localStorage.setItem('verification_email', response.email || formData.email);
          if (response.user?.id) {
            localStorage.setItem('verification_user_id', String(response.user.id));
          } else if (response.user_id) {
            localStorage.setItem('verification_user_id', String(response.user_id));
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

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name Fields */}
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

                  {/* Organization Name */}
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

                  {/* Organization Slug */}
                  <div>
                    <label htmlFor="organizationSlug" className="block text-sm font-medium text-navy-700 mb-2">
                      Organization URL Slug
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type="text"
                        id="organizationSlug"
                        value={formData.organizationSlug}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="grace-assembly-lagos (optional)"
                      />
                    </div>
                    <p className="text-xs text-navy-500 mt-1">Your page will be at volatilive.com/{formData.organizationSlug || 'your-org'}</p>
                  </div>

                  {/* Organization Description */}
                  <div>
                    <label htmlFor="organizationDescription" className="block text-sm font-medium text-navy-700 mb-2">
                      Organization Description
                    </label>
                    <textarea
                      id="organizationDescription"
                      value={formData.organizationDescription}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Tell us about your organization (optional)"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-2">
                      Organization Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-navy-300 rounded-lg cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FileImage className="w-8 h-8 text-navy-400" />
                        )}
                      </label>
                      <div className="flex-1">
                        {logoFile && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-navy-600">{logoFile.name}</span>
                            <button
                              type="button"
                              onClick={removeLogo}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-navy-500">Upload your organization logo (optional)</p>
                      </div>
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

                <div className="mt-6 space-y-3 text-center">
                  <p className="text-navy-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-sky-600 font-medium hover:underline">
                      Login
                    </Link>
                  </p>
                  <p className="text-navy-500">
                    Just want to watch?{" "}
                    <Link href="/signup/user" className="text-sky-600 font-medium hover:underline">
                      Sign up as a viewer
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
                Please check your email and click the verification link to activate your account, then login to start streaming.
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
