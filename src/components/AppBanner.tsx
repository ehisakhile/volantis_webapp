"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useAppBanner } from '@/hooks/useAppBanner';

const APP_SCHEME = 'https://volantislive.com';
const IOS_STORE_URL = 'https://apps.apple.com/us/app/volantislive/id6762115839';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.volantislive.volantislive';

export function AppBanner() {
  const { show, platform, dismiss } = useAppBanner();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!show) return null;

  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams}`
    : pathname;

    const deepLink = `${APP_SCHEME}${currentPath}`; 

  const storeUrl = platform === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;

  const handleOpen = () => {
    window.location.href = deepLink;

    setTimeout(() => {
      window.location.href = storeUrl;
    }, 1500);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex items-center gap-3 z-[9999]">
      <img
        src="/app-icon.png"
        alt="Volantislive"
        width={48}
        height={48}
        className="rounded-lg flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground m-0">Volantislive</p>
        <p className="text-xs text-muted m-0">Better experience in the app</p>
      </div>

      <div className="flex flex-col gap-1.5 items-end">
        <button
          onClick={handleOpen}
          className="whitespace-nowrap px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 active:bg-sky-700 transition-colors"
        >
          Open app
        </button>
        <button
          onClick={dismiss}
          className="text-xs text-muted hover:text-foreground bg-transparent border-none cursor-pointer p-0"
        >
          Continue in browser
        </button>
      </div>
    </div>
  );
}

export default AppBanner;