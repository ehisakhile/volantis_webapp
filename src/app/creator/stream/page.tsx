"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorStreaming } from '@/components/streaming/creator-streaming';
import { useAuth } from '@/lib/auth-context';
import type { VolLivestreamOut } from '@/types/livestream';

export default function CreatorStreamPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, checkEmailVerification, isEmailVerified } = useAuth();
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  
  // Handle stream started - now receives the full VolLivestreamOut from the component
  const handleStreamStarted = useCallback((stream: VolLivestreamOut) => {
    setCurrentStream(stream);
    console.log('Stream started:', stream);
  }, []);
  
  // Handle stream stopped
  const handleStreamStopped = useCallback(() => {
    setCurrentStream(null);
  }, []);
  
  // Check email verification on mount
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      checkEmailVerification().then((verified) => {
        setIsVerified(verified);
        if (!verified) {
          // Redirect to verify email if not verified
          router.push('/verify-email');
        }
      });
    }
  }, [authLoading, isAuthenticated, checkEmailVerification, router]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-sky-500">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  // Show loading while checking verification
  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-sky-500">Verifying email...</div>
      </div>
    );
  }
  
  // Don't render streaming component if not verified
  if (!isVerified) {
    return null;
  }
  
  return (
    <CreatorStreaming
      onStreamStarted={handleStreamStarted}
      onStreamStopped={handleStreamStopped}
    />
  );
}
