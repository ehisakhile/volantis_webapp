"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorVideoStreaming } from '@/components/streaming/creator-video-streaming';
import { SubscriptionLimitModal } from '@/components/subscription/subscription-limit-modal';
import { useAuth } from '@/lib/auth-context';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import type { VolLivestreamOut } from '@/types/livestream';

export default function CreatorVideoPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, checkEmailVerification, isEmailVerified } = useAuth();
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [streamPermission, setStreamPermission] = useState<{ allowed: boolean; reason: string } | null>(null);

  const currentStreamRef = useRef<VolLivestreamOut | null>(null);
  currentStreamRef.current = currentStream;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!currentStreamRef.current) return;
      e.preventDefault();
      e.returnValue = 'Leaving this page will end your video stream. Are you sure?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!currentStreamRef.current) return;
      const confirmed = window.confirm(
        'Navigating away will end your video stream for all viewers. Are you sure?'
      );
      if (!confirmed) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleStreamStarted = useCallback((stream: VolLivestreamOut) => {
    setCurrentStream(stream);
    console.log('Video stream started:', stream);
  }, []);

  const handleStreamStopped = useCallback(() => {
    setCurrentStream(null);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || currentStream) return;

    checkEmailVerification().then((verified) => {
      setIsVerified(verified);
      if (!verified) {
        router.push('/verify-email');
      }
    });
  }, [authLoading, isAuthenticated, currentStream, checkEmailVerification, router]);

  useEffect(() => {
    if (isAuthenticated && isVerified) {
      subscriptionsApi.canStream()
        .then((result) => {
          setStreamPermission({ allowed: result.allowed, reason: result.reason });
        })
        .catch(() => {
          setStreamPermission({ allowed: true, reason: '' });
        });
    }
  }, [isAuthenticated, isVerified]);

  useEffect(() => {
    if (currentStream) return;

    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [authLoading, isAuthenticated, router, user, currentStream]);

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

  if (streamPermission && !streamPermission.allowed && !currentStream) {
    return (
      <SubscriptionLimitModal
        isOpen={true}
        onClose={() => router.push('/dashboard')}
        title="Cannot Start Video Stream"
        reason={streamPermission.reason}
        action="stream"
      />
    );
  }

  return (
    <CreatorVideoStreaming
      key="creator-video-streaming-stable"
      onStreamStarted={handleStreamStarted}
      onStreamStopped={handleStreamStopped}
    />
  );
}