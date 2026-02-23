'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { Radio, Users, BarChart3, Settings, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
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

  const menuItems = [
    { icon: Radio, label: 'Live Streams', href: '/dashboard/streams', color: 'bg-sky-500' },
    { icon: Users, label: 'Viewers', href: '/dashboard/viewers', color: 'bg-green-500' },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', color: 'bg-purple-500' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'bg-navy-500' },
  ];

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Header */}
      <header className="bg-white border-b border-navy-100">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-navy-900">Volantislive</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-sky-600">
                    {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-navy-700">{user?.username || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-navy-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <Container>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Welcome back!</h1>
            <p className="text-navy-600">Manage your live streams and view analytics</p>
          </div>

          {/* Quick Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-navy-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-navy-500">Total Streams</span>
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Radio className="w-5 h-5 text-sky-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-navy-900">0</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-navy-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-navy-500">Total Viewers</span>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-navy-900">0</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-navy-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-navy-500">Hours Streamed</span>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-navy-900">0</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-navy-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-navy-500">Company</span>
                <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-navy-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-navy-900 truncate">{user?.company_name || 'N/A'}</p>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="bg-white rounded-xl p-6 border border-navy-100 hover:border-sky-200 hover:shadow-md transition-all group"
              >
                <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-navy-900">{item.label}</h3>
                <p className="text-sm text-navy-500 mt-1">Manage your {item.label.toLowerCase()}</p>
              </Link>
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}
