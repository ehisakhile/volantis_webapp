'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api/auth';
import { User, Mail, Bell, Heart, Radio, CheckCircle, AlertCircle, Loader2, Settings, LogOut, Play, Users, Clock } from 'lucide-react';
import type { Subscription } from '@/types/auth';

export default function UserDashboardPage() {
  const router = useRouter();
  const { user, logout, fetchUser, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Check if user is a creator/admin (has company_id) - redirect to creator dashboard
    if (isAuthenticated && user && user.company_id) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router, user]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.username || '');
      loadSubscriptions();
    }
  }, [user]);

  const loadSubscriptions = async () => {
    setIsLoadingSubs(true);
    try {
      const subs = await authApi.getMySubscriptions();
      setSubscriptions(subs);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  const handleUnsubscribe = async (companySlug: string) => {
    try {
      await authApi.unsubscribeFromCompany(companySlug);
      setSubscriptions(prev => prev.filter(s => s.company_slug !== companySlug));
      setSuccess('Successfully unsubscribed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to unsubscribe. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // In a real implementation, this would call an API to update the user profile
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await fetchUser();
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Header */}
      <header className="bg-white border-b border-navy-100">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-lg font-bold text-navy-900">Volantislive</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/listen" className="text-navy-600 hover:text-navy-900 font-medium">
                Browse Streams
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-navy-600 hover:text-navy-900 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </Container>
      </header>

      <Container>
        <div className="py-8">
          <h1 className="text-2xl font-bold text-navy-900 mb-2">My Dashboard</h1>
          <p className="text-navy-600 mb-8">Manage your account and subscriptions</p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-navy-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-navy-900">Profile</h2>
                      <p className="text-sm text-navy-500">Manage your account settings</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-navy-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                        placeholder="Your display name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Email
                      </label>
                      <div className="flex items-center gap-2 px-4 py-3 bg-navy-50 rounded-lg text-navy-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      <p className="text-xs text-navy-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" loading={isSaving}>
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setDisplayName(user.username || '');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-navy-400" />
                      <div>
                        <p className="text-sm text-navy-500">Display Name</p>
                        <p className="font-medium text-navy-900">{user.username || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-navy-400" />
                      <div>
                        <p className="text-sm text-navy-500">Email</p>
                        <p className="font-medium text-navy-900">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscriptions Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-navy-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900">My Subscriptions</h2>
                    <p className="text-sm text-navy-500">Channels you follow</p>
                  </div>
                </div>

                {isLoadingSubs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-navy-300 mx-auto mb-4" />
                    <p className="text-navy-600 mb-2">You haven't subscribed to any channels yet</p>
                    <Link href="/listen">
                      <Button variant="outline">Browse Channels</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.company_id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-navy-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          {/* Company Logo */}
                          <Link href={`/${sub.company_slug}`} className="flex-shrink-0">
                            {sub.company_logo_url ? (
                              <img
                                src={sub.company_logo_url}
                                alt={sub.company_name}
                                className="w-14 h-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center">
                                <Radio className="w-7 h-7 text-white" />
                              </div>
                            )}
                          </Link>
                          
                          {/* Company Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                href={`/${sub.company_slug}`}
                                className="font-semibold text-navy-900 hover:text-sky-600 truncate"
                              >
                                {sub.company_name}
                              </Link>
                              {sub.is_live && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full animate-pulse">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                  LIVE
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-navy-500">
                              {sub.is_live && sub.current_viewers > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {sub.current_viewers} watching
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(sub.subscribed_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-navy-100">
                          <Link href={`/${sub.company_slug}`} className="flex-1">
                            {sub.is_live ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Watch Live
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                View Channel
                              </Button>
                            )}
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnsubscribe(sub.company_slug)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-navy-100">
                <h3 className="font-semibold text-navy-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link 
                    href="/listen" 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-50 transition-colors"
                  >
                    <Radio className="w-5 h-5 text-sky-500" />
                    <span className="text-navy-700">Browse Live Streams</span>
                  </Link>
                  <Link 
                    href="/resend-verification" 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-50 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-sky-500" />
                    <span className="text-navy-700">Resend Verification Email</span>
                  </Link>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-navy-100">
                <h3 className="font-semibold text-navy-900 mb-4">Account Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-navy-500">Account Type</span>
                    <span className="text-navy-900 font-medium">Viewer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-500">Status</span>
                    <span className={`font-medium ${user.is_active ? 'text-green-600' : 'text-amber-600'}`}>
                      {user.is_active ? 'Active' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-500">Member Since</span>
                    <span className="text-navy-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}