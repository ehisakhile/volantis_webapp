'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { categoriesApi, type Category, type CategoriesResponse } from '@/lib/api/categories';
import { 
  Loader2, CheckCircle, AlertCircle, ArrowLeft, 
  BookOpen, Cross, Home, Users, GraduationCap, Star, 
  Gamepad2, Music, Heart, Headphones, Newspaper,
  Radio, Hand, Trophy, Presentation, Mic, Wrench
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  book: BookOpen,
  cross: Cross,
  home: Home,
  users: Users,
  'graduation-cap': GraduationCap,
  star: Star,
  gamepad: Gamepad2,
  music: Music,
  heartbeat: Heart,
  headphones: Headphones,
  newspaper: Newspaper,
  radio: Radio,
  hands: Hand,
  trophy: Trophy,
  chalkboard: Presentation,
  mic: Mic,
  tools: Wrench,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Star;
}

export default function PreferencesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [authLoading, isAuthenticated, router, user]);

  const loadCategories = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      
      const response = await categoriesApi.getCategories(pageNum, 20);
      
      if (append) {
        setCategories(prev => [...prev, ...response.items]);
      } else {
        setCategories(response.items);
      }
      
      setHasMore(response.page < response.total_pages);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const loadExistingPreferences = useCallback(async () => {
    try {
      const preferences = await categoriesApi.getMyCompanyPreferences();
      setSelectedIds(preferences.map(p => p.id));
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.company_id) {
      loadCategories(1);
      loadExistingPreferences();
    }
  }, [isAuthenticated, user, loadCategories, loadExistingPreferences]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadCategories(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, loadCategories]);

  const toggleCategory = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await categoriesApi.setMyCompanyPreferences(selectedIds);
      setSuccess('Preferences saved successfully');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-600">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sky-600">
                  {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </Container>
      </header>

      <Container>
        <div className="py-8 max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Set Your Preferences
            </h1>
            <p className="text-slate-600 mt-2">
              Select the categories that best describe your content. This helps us show your streams to the right audience.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Categories Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {categories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const isSelected = selectedIds.includes(category.id);
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-sky-500 bg-sky-50' 
                          : 'border-slate-200 bg-white hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${category.color}20`, color: category.color }}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900">{category.name}</h3>
                          <p className="text-sm text-slate-500 line-clamp-2">{category.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={loaderRef} className="flex items-center justify-center py-4">
                  {isLoadingMore ? (
                    <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                  ) : (
                    <p className="text-sm text-slate-500">Scroll for more</p>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="sticky bottom-4 bg-slate-50 p-4 -mx-4">
                <Button
                  onClick={handleSave}
                  loading={isSaving}
                  className="w-full"
                  size="lg"
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
                <p className="text-center text-sm text-slate-500 mt-2">
                  Selected {selectedIds.length} category{selectedIds.length !== 1 ? 'ies' : ''}
                </p>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}