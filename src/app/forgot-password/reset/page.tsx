'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Keyboard } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('reset_email');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email stored, redirect back to forgot password
      router.push('/forgot-password');
    }
  }, [router]);

  const handleResendCode = async () => {
    if (!email || countdown > 0) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await authApi.requestPasswordReset(email);
      setCountdown(60); // Start 60 second cooldown
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? String(err.detail)
        : 'Failed to resend code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp) {
      setError('Please enter the verification code');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.verifyPasswordReset(email, otp, newPassword);
      setSuccess(true);
      
      // Clear session storage
      sessionStorage.removeItem('reset_email');
      
      // Fetch user data to update auth state
      await fetchUser();
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? String(err.detail)
        : 'Invalid or expired code. Please try again.';
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
                href="/forgot-password" 
                className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-navy-900 mb-2">
                  {success ? 'Password reset!' : 'Enter verification code'}
                </h1>
                <p className="text-navy-600">
                  {success 
                    ? 'Your password has been reset successfully'
                    : `We sent a code to ${email || 'your email'}. Enter the code and create a new password.`
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
                    Password reset successful! Redirecting you to the dashboard...
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 bg-navy-50 text-navy-600"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-navy-700 mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type="text"
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter 6-digit code"
                        required
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={countdown > 0 || isLoading}
                        className="text-sm text-sky-600 hover:underline disabled:text-navy-400 disabled:no-underline"
                      >
                        {countdown > 0 
                          ? `Resend code in ${countdown}s` 
                          : 'Resend code'
                        }
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-navy-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
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
                    Reset Password
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
