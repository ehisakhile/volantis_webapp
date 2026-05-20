"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorStreaming } from '@/components/streaming/creator-streaming';
import { SubscriptionLimitModal } from '@/components/subscription/subscription-limit-modal';
import { useAuth } from '@/lib/auth-context';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import type { VolLivestreamOut } from '@/types/livestream';

export default function CreatorStreamPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, checkEmailVerification, isEmailVerified } = useAuth();
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [streamPermission, setStreamPermission] = useState<{ allowed: boolean; reason: string } | null>(null);

  // Keep a ref so event handlers always see the latest stream state
  // without needing to be re-registered on every render
  const currentStreamRef = useRef<VolLivestreamOut | null>(null);
  currentStreamRef.current = currentStream;

  // ─── FIX #1: Block browser refresh / tab close while streaming ───────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!currentStreamRef.current) return;
      e.preventDefault();
      // Modern browsers show a generic message; setting returnValue triggers the dialog
      e.returnValue = 'Leaving this page will end your livestream. Are you sure?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Register once — ref keeps value current

  // ─── FIX #2: Block browser back/forward button while streaming ───────────
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!currentStreamRef.current) return;
      const confirmed = window.confirm(
        'Navigating away will end your livestream for all viewers. Are you sure?'
      );
      if (!confirmed) {
        // Push a new entry back so the user stays on this page
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Push a sentinel state so we can catch the first back-press
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Register once — ref keeps value current

  // ─── Handle stream started ────────────────────────────────────────────────
  const handleStreamStarted = useCallback((stream: VolLivestreamOut) => {
    setCurrentStream(stream);
    console.log('Stream started:', stream);
  }, []);

  // ─── Handle stream stopped ────────────────────────────────────────────────
  const handleStreamStopped = useCallback(() => {
    setCurrentStream(null);
  }, []);

  // ─── FIX #3: Only run auth/email checks when NOT actively streaming ───────
  // Prevents a mid-stream redirect to /verify-email from killing the session
  useEffect(() => {
    if (authLoading || !isAuthenticated || currentStream) return;

    checkEmailVerification().then((verified) => {
      setIsVerified(verified);
      if (!verified) {
        router.push('/verify-email');
      }
    });
  }, [authLoading, isAuthenticated, currentStream, checkEmailVerification, router]);

  // Check streaming permission on mount
  // useEffect(() => {
  //   if (isAuthenticated && isVerified) {
  //     subscriptionsApi.canStream()
  //       .then((result) => {
  //         setStreamPermission({ allowed: result.allowed, reason: result.reason });
  //       })
  //       .catch(() => {
  //         // Default to allowed if API fails
  //         setStreamPermission({ allowed: true, reason: '' });
  //       });
  //   }
  // }, [isAuthenticated, isVerified]);

  // ─── FIX #4: Only redirect when NOT actively streaming ───────────────────
  // Prevents auth state flicker from navigating away mid-stream
  useEffect(() => {
    if (currentStream) return; // Never redirect while a stream is live

    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [authLoading, isAuthenticated, router, user, currentStream]);

  // ─── Loading states ───────────────────────────────────────────────────────
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

  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-sky-500">Verifying email...</div>
      </div>
    );
  }

  if (!isVerified) {
    return null;
  }

  // ─── FIX #5: Only show subscription modal when NOT streaming ─────────────
  // Avoids remounting <CreatorStreaming> due to permission state changes
  if (streamPermission && !streamPermission.allowed && !currentStream) {
    return (
      <SubscriptionLimitModal
        isOpen={true}
        onClose={() => router.push('/dashboard')}
        title="Cannot Start Stream"
        reason={streamPermission.reason}
        action="stream"
      />
    );
  }

  // Show loading while checking permissions
  // if (!streamPermission) {
  //   return (
  //     <div className="min-h-screen bg-slate-950 flex items-center justify-center">
  //       <div className="animate-pulse text-sky-500">Checking permissions...</div>
  //     </div>
  //   );
  // }

  // ─── FIX #6: Stable key ensures <CreatorStreaming> is never remounted ─────
  // All permission/auth state changes above are guarded so this line is
  // only ever reached once, but the explicit key makes it unmistakable.
  return (
    <CreatorStreaming
      key="creator-streaming-stable"
      onStreamStarted={handleStreamStarted}
      onStreamStopped={handleStreamStopped}
    />
  );
}