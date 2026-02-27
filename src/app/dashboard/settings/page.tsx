'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { companyApi } from '@/lib/api/company';
import type { VolCompanyResponse } from '@/types/company';
import { 
  Radio, 
  ArrowLeft, 
  Building2, 
  Link as LinkIcon, 
  FileText, 
  Upload, 
  Save, 
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  
  const [company, setCompany] = useState<VolCompanyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Check if user is a viewer (no company_id) - redirect to user dashboard
    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [isAuthenticated, authLoading, router, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompany();
    }
  }, [isAuthenticated]);

  const fetchCompany = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await companyApi.getMyCompany();
      setCompany(data);
      setName(data.name || '');
      setSlug(data.slug || '');
      setDescription(data.description || '');
      setLogoPreview(data.logo_url || null);
    } catch (err: unknown) {
      const error = err as { detail?: string };
      setError(error.detail || 'Failed to load company information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updatedCompany = await companyApi.editMyCompany({
        name,
        slug,
        description,
        logo: logoFile,
      });
      setCompany(updatedCompany);
      setLogoFile(null);
      setSuccess('Company profile updated successfully!');
    } catch (err: unknown) {
      const error = err as { detail?: string };
      setError(error.detail || 'Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    try {
      await companyApi.deleteMyCompany();
      // Logout and redirect to home after deleting
      await logout();
      router.push('/');
    } catch (err: unknown) {
      const error = err as { detail?: string };
      setError(error.detail || 'Failed to delete company');
      setShowDeleteConfirm(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Header */}
      <header className="bg-white border-b border-navy-100">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Volantislive"
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-sm text-navy-600 hover:text-sky-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <Container>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900">Company Settings</h1>
            <p className="text-navy-600">Manage your company profile and settings</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Settings Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-navy-100 p-6">
                <h2 className="text-lg font-semibold text-navy-900 mb-6">Profile Information</h2>
                
                {/* Logo Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Company Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-navy-100 rounded-lg flex items-center justify-center overflow-hidden border border-navy-200">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Company logo" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-navy-400" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-navy-200 rounded-lg text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </button>
                      <p className="text-xs text-navy-500 mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Company Name */}
                <div className="mb-6">
                  <label htmlFor="name" className="block text-sm font-medium text-navy-700 mb-2">
                    <Building2 className="w-4 h-4 inline-block mr-1" />
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Enter company name"
                    required
                  />
                  <p className="text-xs text-navy-500 mt-1">Can only be changed once every 30 days</p>
                </div>

                {/* Company Slug */}
                <div className="mb-6">
                  <label htmlFor="slug" className="block text-sm font-medium text-navy-700 mb-2">
                    <LinkIcon className="w-4 h-4 inline-block mr-1" />
                    Company Slug
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 bg-navy-50 border border-r-0 border-navy-200 rounded-l-lg text-sm text-navy-500">
                      volantislive.com/
                    </span>
                    <input
                      type="text"
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="flex-1 px-4 py-2 border border-navy-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="your-company"
                      required
                    />
                  </div>
                  <p className="text-xs text-navy-500 mt-1">Can only be changed once every 30 days</p>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-navy-700 mb-2">
                    <FileText className="w-4 h-4 inline-block mr-1" />
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                    placeholder="Tell viewers about your company..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Company Info Card */}
              <div className="bg-white rounded-xl border border-navy-100 p-6">
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Company Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-navy-500">Company ID</p>
                    <p className="text-sm font-medium text-navy-900">#{company?.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      company?.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Created</p>
                    <p className="text-sm font-medium text-navy-900">
                      {company?.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Public URL</p>
                    <a 
                      href={`/companies/${company?.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-sky-600 hover:underline"
                    >
                      volantislive.com/{company?.slug}
                    </a>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-xl border border-red-100 p-6">
                <h3 className="text-sm font-semibold text-red-600 mb-4">Danger Zone</h3>
                <p className="text-sm text-navy-600 mb-4">
                  Permanently delete your company and all associated data. This action cannot be undone.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Company
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <p className="text-sm text-red-700 font-medium">
                        Are you sure? This is irreversible!
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteCompany}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-navy-200 rounded-lg text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
