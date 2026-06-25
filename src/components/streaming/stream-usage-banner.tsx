'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Crown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreamUsage } from '@/types/usage';

interface StreamUsageBannerProps {
  usage: StreamUsage;
  onDismiss: () => void;
  dismissed: boolean;
}

function formatSeconds(secs: number): string {
  if (secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StreamUsageBanner({ usage, onDismiss, dismissed }: StreamUsageBannerProps) {
  const { usage_percentage, daily_remaining_seconds, plan_name, daily_limit_seconds } = usage;
  const isNearLimit = usage_percentage >= 95;
  const limitMinutes = Math.round(daily_limit_seconds / 60);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="usage-banner"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={cn(
            'relative rounded-xl border px-4 py-3 mb-4 overflow-hidden',
            isNearLimit
              ? 'bg-red-950/60 border-red-500/40'
              : 'bg-amber-950/60 border-amber-500/40'
          )}
        >
          {/* Animated progress fill behind content */}
          <div
            className={cn(
              'absolute inset-0 origin-left opacity-10 transition-all duration-1000',
              isNearLimit ? 'bg-red-500' : 'bg-amber-500'
            )}
            style={{ transform: `scaleX(${Math.min(usage_percentage / 100, 1)})` }}
          />

          <div className="relative flex items-center gap-3">
            {/* Icon */}
            <div className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              isNearLimit ? 'bg-red-500/20' : 'bg-amber-500/20'
            )}>
              <AlertTriangle className={cn(
                'w-4 h-4',
                isNearLimit ? 'text-red-400' : 'text-amber-400'
              )} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-semibold leading-tight',
                isNearLimit ? 'text-red-300' : 'text-amber-300'
              )}>
                {isNearLimit ? 'Stream limit almost reached' : 'Approaching daily stream limit'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-medium text-slate-300">{formatSeconds(daily_remaining_seconds)}</span>
                {' '}remaining on {plan_name} plan · {Math.round(usage_percentage)}% used of {limitMinutes}m daily limit
              </p>
            </div>

            {/* Progress pill */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Clock className="w-3 h-3 text-slate-500" />
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    isNearLimit ? 'bg-red-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${Math.min(usage_percentage, 100)}%` }}
                />
              </div>
              <span className={cn(
                'text-xs font-mono font-semibold',
                isNearLimit ? 'text-red-400' : 'text-amber-400'
              )}>
                {Math.round(usage_percentage)}%
              </span>
            </div>

            {/* Upgrade link */}
            <a
              href="/dashboard/upgrade"
              className={cn(
                'hidden sm:flex items-center gap-1 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                isNearLimit
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              )}
            >
              <Crown className="w-3 h-3" />
              Upgrade
            </a>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="shrink-0 p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
