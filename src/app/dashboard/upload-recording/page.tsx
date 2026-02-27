'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { recordingsApi } from '@/lib/api/recordings';
import {
  Radio, Upload, FileAudio, Image, Play, ArrowLeft,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import type { VolRecordingOut } from '@/types/livestream';

export default function UploadRecordingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  // Preview URLs
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  
  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<VolRecordingOut | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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

  // Get audio duration when file is selected
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid audio file (MP3, WAV, OGG, WebM, M4A)');
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 500MB');
      return;
    }

    setError(null);
    setAudioFile(file);
    
    // Create preview URL
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);

    // Get duration
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setDurationSeconds(Math.floor(audio.duration));
    });
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Thumbnail size must be less than 10MB');
      return;
    }

    setError(null);
    setThumbnailFile(file);

    // Create preview URL
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setThumbnailPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!audioFile) {
      setError('Please select an audio file');
      return;
    }
    if (durationSeconds <= 0) {
      setError('Could not determine audio duration');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress('Preparing upload...');

    try {
      setUploadProgress('Uploading recording...');
      const result = await recordingsApi.uploadRecording(
        audioFile,
        title.trim(),
        description.trim(),
        durationSeconds,
        thumbnailFile || undefined
      );
      
      setSuccess(result);
      setUploadProgress('Upload complete!');
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err 
        ? String(err.detail) 
        : 'Failed to upload recording. Please try again.';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <Container>
            <div className="flex items-center justify-between h-16">
              <Link href="/dashboard" className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Volantislive"
                  className="h-8 w-auto"
                />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </Container>
        </header>

        <main className="py-12">
          <Container>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful!</h1>
                <p className="text-slate-600 mb-6">Your recording is now available for your audience to play.</p>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-semibold text-slate-900 mb-2">{success.title}</h3>
                  {success.description && (
                    <p className="text-sm text-slate-600 mb-2">{success.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>Duration: {formatDuration(success.duration_seconds || 0)}</span>
                    <span>Created: {new Date(success.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setSuccess(null);
                      setTitle('');
                      setDescription('');
                      setAudioFile(null);
                      setThumbnailFile(null);
                      setDurationSeconds(0);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                    }}
                    className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Upload Another
                  </button>
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </main>
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
              <img
                src="/logo.png"
                alt="Volantislive"
                className="h-8 w-auto"
              />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <Container>
          <div className="max-w-2xl mx-auto">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Upload Recording</h1>
              <p className="text-slate-600">Share pre-recorded audio with your audience</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Audio File Upload */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                    <FileAudio className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Audio File</h3>
                    <p className="text-sm text-slate-500">Upload your recording (MP3, WAV, OGG, WebM, M4A)</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-sky-50 file:text-sky-700
                    hover:file:bg-sky-100
                  "
                />

                {/* Audio Preview */}
                {audioPreviewUrl && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <audio
                      ref={audioRef}
                      controls
                      className="w-full"
                      src={audioPreviewUrl}
                    />
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                      <span>Duration: {formatDuration(durationSeconds)}</span>
                      {audioFile && (
                        <span>Size: {(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail Upload */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Image className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Thumbnail (Optional)</h3>
                    <p className="text-sm text-slate-500">Add a cover image for your recording</p>
                  </div>
                </div>

                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleThumbnailFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-purple-50 file:text-purple-700
                    hover:file:bg-purple-100
                  "
                />

                {/* Thumbnail Preview */}
                {thumbnailPreviewUrl && (
                  <div className="mt-4">
                    <img
                      src={thumbnailPreviewUrl}
                      alt="Thumbnail preview"
                      className="w-48 h-48 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter recording title"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your recording..."
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">{description.length}/500 characters</p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || !audioFile || !title.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadProgress || 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Recording
                  </>
                )}
              </button>
            </form>
          </div>
        </Container>
      </main>
    </div>
  );
}