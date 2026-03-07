"use client";

import { useState, useCallback, useEffect } from 'react';
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
  
  // Redirect if not authenticated or if user is a viewer (no company_id)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Check if user is a viewer (no company_id) - redirect to user dashboard
    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [authLoading, isAuthenticated, router, user]);
  
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

  // Show subscription limit modal if not allowed to stream
  if (streamPermission && !streamPermission.allowed) {
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
  
  return (
    <CreatorStreaming
      onStreamStarted={handleStreamStarted}
      onStreamStopped={handleStreamStopped}
    />
  );
}
