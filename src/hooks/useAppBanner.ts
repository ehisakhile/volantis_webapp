"use client";

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'app_banner_dismissed_until';
const DISMISS_DAYS = 14;

export function useAppBanner() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (!isIOS && !isAndroid) return;

    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    setPlatform(isIOS ? 'ios' : 'android');
    setShow(true);
  }, []);

  const dismiss = () => {
    const expiry = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(expiry));
    setShow(false);
  };

  return { show, platform, dismiss };
}

export default useAppBanner;