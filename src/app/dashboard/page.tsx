'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import {
  Radio, Users, BarChart3, Settings, LogOut,
  Play, Eye, Clock, TrendingUp, Link as LinkIcon,
  Video, MessageSquare, DollarSign, Bell
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [companySlug, setCompanySlug] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Get company slug from user context if available
    if (user?.company_slug) {
      setCompanySlug(user.company_slug);
    }
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
    { icon: Video, label: 'My Streams', href: '/dashboard/settings', color: 'bg-sky-500', description: 'View past broadcasts' },
    { icon: Users, label: 'Viewers', href: '/dashboard/settings', color: 'bg-green-500', description: 'Audience insights' },
    { icon: MessageSquare, label: 'Chat', href: '/dashboard/settings', color: 'bg-purple-500', description: 'Manage messages' },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/settings', color: 'bg-indigo-500', description: 'Performance metrics' },
    { icon: DollarSign, label: 'Revenue', href: '/dashboard/settings', color: 'bg-emerald-500', description: 'Earnings & plans' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'bg-slate-500', description: 'Channel configuration' },
  ];

  const quickStats = [
    { label: 'Total Streams', value: '0', icon: Radio, color: 'text-sky-600', bg: 'bg-sky-100' },
    { label: 'Total Viewers', value: '0', icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Hours Streamed', value: '0', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Subscribers', value: '0', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">Volantis<span className="text-sky-500">live</span></span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/listen"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Channel
              </Link>
              <button
                onClick={handleGoLive}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Go Live
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
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.username || 'Creator'}!</h1>
            <p className="text-slate-600">Manage your live streams and grow your audience</p>
          </div>

          {/* Quick Action - Go Live */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-2">Ready to go live?</h2>
                <p className="text-red-100">Start streaming to your audience right now</p>
              </div>
              <button
                onClick={handleGoLive}
                className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Broadcasting
              </button>
            </div>
          </div>

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
