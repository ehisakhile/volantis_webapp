'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api/client';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import {
  Radio, Users, BarChart3, Settings, LogOut,
  Play, Eye, Clock, TrendingUp, Link as LinkIcon,
  Video, MessageSquare, DollarSign, Bell, Upload,
  Plug, Crown, Zap, X
} from 'lucide-react';

// Subscription API Response Type
interface Subscription {
  id: number;
  company_id: number;
  plan_id: number;
  billing_cycle: string;
  subscription_start: string;
  subscription_end: string | null;
  paystack_subscription_code: string | null;
  paystack_customer_code: string | null;
  is_active: boolean;
  auto_renew: boolean;
  referral_code: string;
  additional_integrations: number;
  integration_addon_price_kobo: number;
  created_at: string;
  updated_at: string;
  plan_name: string;
  plan_display_name: string;
  monthly_price_kobo: number;
  annual_price_kobo: number;
  daily_stream_used: number;
  daily_stream_limit: number;
  monthly_uploads_used: number;
  monthly_uploads_limit: number;
  integrations_used: number;
  integrations_allowed: number;
  is_within_limits: boolean;
}

// Stats API Response Type
interface StreamStats {
  company_slug: string;
  company_name: string;
  total_streams: number;
  total_streamed_time: {
    hours: number;
    minutes: number;
  };
  subscriber_count: number;
  current_viewers: number;
  is_live: boolean;
  active_stream_title: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ message: string; endDate: string } | null>(null);

  // Fetch stats from API
  const fetchStats = async (slug: string) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await apiClient.requestWithAuth<StreamStats>(
        `/subscriptions/${slug}/stats`
      );
      setStats(response);
    } catch (err: unknown) {
      console.error('Failed to fetch stats:', err);
      setStatsError('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch subscription from API
  const fetchSubscription = async () => {
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    setCancelResult(null);
    try {
      const response = await apiClient.requestWithAuth<Subscription>(
        '/api/subscriptions/current'
      );
      setSubscription(response);
    } catch (err: unknown) {
      console.error('Failed to fetch subscription:', err);
      setSubscriptionError('Failed to load subscription');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? Your access will continue until the end of your billing period.')) {
      return;
    }
    
    setIsCancelling(true);
    try {
      const response = await subscriptionsApi.cancelSubscription();
      setCancelResult({
        message: response.message,
        endDate: response.subscription_end_date
      });
      // Refresh subscription data
      fetchSubscription();
    } catch (err: unknown) {
      console.error('Failed to cancel subscription:', err);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Check if user is a viewer (no company_id) - redirect to user dashboard
    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user]);

  useEffect(() => {
    // Get company slug from user context if available
    if (user?.company_slug) {
      setCompanySlug(user.company_slug);
      fetchStats(user.company_slug);
    }
    // Fetch subscription details
    fetchSubscription();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleGoLive = () => {
    router.push('/creator/stream');
  };

  const menuItems = [
    { icon: Play, label: 'Go Live', href: '/creator/stream', color: 'bg-red-500', description: 'Start streaming now' },
    { icon: Upload, label: 'Upload Recording', href: '/dashboard/upload-recording', color: 'bg-orange-500', description: 'Upload pre-recorded audio' },
    { icon: Video, label: 'My Streams', href: `/${companySlug}`, color: 'bg-sky-500', description: 'View past broadcasts' },
    { icon: Plug, label: 'Integrations', href: '/dashboard/integrations', color: 'bg-indigo-500', description: 'Connect external services' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'bg-slate-500', description: 'Channel configuration' },
  ];

  // Format streamed time from API response (handles negative values from backend)
  const formatStreamedTime = (hours: number, minutes: number) => {
    // Use absolute values to handle potential negative values from backend
    const totalHours = Math.abs(hours);
    const totalMinutes = Math.abs(minutes);
    if (totalHours > 0) {
      return `${totalHours}h ${totalMinutes}m`;
    }
    return `${totalMinutes}m`;
  };

  const quickStats = [
    {
      label: 'Total Streams',
      value: statsLoading ? '-' : String(stats?.total_streams ?? '0'),
      icon: Radio,
      color: 'text-sky-600',
      bg: 'bg-sky-100'
    },
    {
      label: 'Current Viewers',
      value: statsLoading ? '-' : String(stats?.current_viewers ?? '0'),
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      label: 'Stream Time',
      value: statsLoading ? '-' : (stats ? formatStreamedTime(stats.total_streamed_time.hours, stats.total_streamed_time.minutes) : '0m'),
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      label: 'Subscribers',
      value: statsLoading ? '-' : String(stats?.subscriber_count ?? '0'),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Volantislive"
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/listen"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Channel
              </Link>
              {/* Live Status Indicator */}
              {stats && stats.is_live && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-sm font-medium text-red-600">LIVE</span>
                </div>
              )}
              <button
                onClick={handleGoLive}
                className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                  stats?.is_live ? 'bg-slate-500 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                <Play className="w-4 h-4" />
                {stats?.is_live ? 'Manage Stream' : 'Go Live'}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-sky-600">
                    {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user?.username || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <Container>
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.username || 'Creator'}!
            </h1>
            <p className="text-slate-600">
              {stats?.company_name ? `Managing ${stats.company_name}` : 'Manage your live streams and grow your audience'}
            </p>
          </div>

          {/* Quick Action - Go Live */}
          <div className={`rounded-2xl p-6 mb-8 text-white ${
            stats?.is_live
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                {stats?.is_live ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                      <h2 className="text-xl font-bold">Now Live</h2>
                    </div>
                    <p className="text-green-100">
                      {stats.active_stream_title || 'Streaming to your audience'}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold mb-2">Ready to go live?</h2>
                    <p className="text-red-100">Start streaming to your audience right now</p>
                  </>
                )}
              </div>
              <button
                onClick={handleGoLive}
                className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-colors ${
                  stats?.is_live
                    ? 'bg-white text-green-600 hover:bg-green-50'
                    : 'bg-white text-red-600 hover:bg-red-50'
                }`}
              >
                <Play className="w-5 h-5" />
                {stats?.is_live ? 'Manage Broadcast' : 'Start Broadcasting'}
              </button>
            </div>
          </div>

          {/* Subscription Card */}
          {subscription && (
            <div className="bg-white rounded-xl p-5 border border-slate-200 mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    subscription.plan_name === 'free' 
                      ? 'bg-slate-100' 
                      : 'bg-amber-100'
                  }`}>
                    {subscription.plan_name === 'free' ? (
                      <Zap className="w-6 h-6 text-slate-600" />
                    ) : (
                      <Crown className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {subscription.plan_display_name} Plan
                      </h3>
                      {subscription.is_active ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {subscription.plan_name === 'free' 
                        ? 'Upgrade to unlock more features'
                        : `${subscription.billing_cycle === 'monthly' ? 'Monthly' : 'Annual'} billing`
                      }
                    </p>
                  </div>
                </div>
                
                {subscription.plan_name === 'free' && (
                  <Link
                    href="/dashboard/upgrade"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Plan
                  </Link>
                )}

                {/* Cancel button for paid plans */}
                {subscription.plan_name !== 'free' && subscription.is_active && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCancelling}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Cancel Subscription
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Cancel result message */}
              {cancelResult && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Subscription will end on:</strong> {new Date(cancelResult.endDate).toLocaleDateString('en-NG', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
              
              {/* Usage Stats - Only show for non-free plans or if there are limits */}
              {subscription.plan_name !== 'free' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Daily Stream Time */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Daily Stream Time</p>
                      <p className="text-sm font-medium text-slate-900">
                        {Math.floor(subscription.daily_stream_used / 60)}m / {subscription.daily_stream_limit / 60}h
                      </p>
                      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${Math.min((subscription.daily_stream_used / subscription.daily_stream_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Monthly Uploads */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Monthly Uploads</p>
                      <p className="text-sm font-medium text-slate-900">
                        {subscription.monthly_uploads_used} / {subscription.monthly_uploads_limit}
                      </p>
                      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min((subscription.monthly_uploads_used / subscription.monthly_uploads_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Integrations */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Integrations</p>
                      <p className="text-sm font-medium text-slate-900">
                        {subscription.integrations_used} / {subscription.integrations_allowed}
                      </p>
                      <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min((subscription.integrations_used / (subscription.integrations_allowed || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Price</p>
                      <p className="text-sm font-medium text-slate-900">
                        {subscription.monthly_price_kobo > 0 
                          ? `₦${(subscription.monthly_price_kobo / 100).toLocaleString()}/mo`
                          : subscription.annual_price_kobo > 0 
                            ? `₦${(subscription.annual_price_kobo / 100).toLocaleString()}/yr`
                            : 'Free'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickStats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">{stat.label}</span>
                  <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Channel Link */}
          {companySlug && (
            <div className="bg-white rounded-xl p-4 border border-slate-200 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Your Channel Link</p>
                    <p className="text-sm text-slate-500">Share this with your audience</p>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${companySlug}`)}
                  className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Copy Link
                </button>
              </div>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <code className="text-sm text-sky-600">{window.location.origin}/{companySlug}</code>
              </div>
            </div>
          )}

          {/* Menu Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="bg-white rounded-xl p-5 border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}
