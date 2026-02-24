"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorStreaming } from '@/components/streaming/creator-streaming';
import { useAuth } from '@/lib/auth-context';
import type { VolLivestreamOut } from '@/types/livestream';

export default function CreatorStreamPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  
  // Handle stream started - now receives the full VolLivestreamOut from the component
  const handleStreamStarted = useCallback((stream: VolLivestreamOut) => {
    setCurrentStream(stream);
    console.log('Stream started:', stream);
  }, []);
  
  // Handle stream stopped
  const handleStreamStopped = useCallback(() => {
    setCurrentStream(null);
  }, []);
  
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
  
  return (
    <CreatorStreaming
      onStreamStarted={handleStreamStarted}
      onStreamStopped={handleStreamStopped}
    />
  );
}
