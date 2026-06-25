'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap, Clock, BarChart2, ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';
import type { StreamUsage } from '@/types/usage';

interface StreamLimitModalProps {
  isOpen: boolean;
  usage: StreamUsage | null;
}

function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function StreamLimitModal({ isOpen, usage }: StreamLimitModalProps) {
  const usedMinutes = usage ? Math.round(usage.daily_used_seconds / 60) : 0;
  const limitMinutes = usage ? Math.round(usage.daily_limit_seconds / 60) : 0;
  const planName = usage?.plan_name ?? 'Free';

  // Trap focus inside modal
  const upgradeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (isOpen) upgradeRef.current?.focus();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="limit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            key="limit-modal"
            initial={{ scale: 0.93, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Gradient top stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

            <div className="p-7">
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
                    <Radio className="w-7 h-7 text-red-400" />
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-red-500/50 animate-ping opacity-30" />
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-xl font-bold text-white text-center mb-1">
                Daily stream limit reached
              </h2>
              <p className="text-sm text-slate-400 text-center mb-6">
                Your {planName} plan includes {limitMinutes} minutes of streaming per day.
                Your broadcast has been paused.
              </p>

              {/* Usage stat cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">Used today</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {usedMinutes}<span className="text-sm font-normal text-slate-400 ml-1">min</span>
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Daily limit</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {limitMinutes}<span className="text-sm font-normal text-slate-400 ml-1">min</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Usage</span>
                  <span className="text-red-400 font-medium">
                    {usage ? Math.round(usage.usage_percentage) : 100}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(usage?.usage_percentage ?? 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                  />
                </div>
              </div>

              {/* Upgrade CTA */}
              <Link
                ref={upgradeRef}
                href="/dashboard/upgrade"
                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-900/30 mb-3 group"
              >
                <Crown className="w-4 h-4" />
                Upgrade to stream without limits
                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* What you get */}
              <div className="bg-slate-800/40 rounded-xl px-4 py-3 mb-3">
                <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wide">
                  Paid plans include
                </p>
                <ul className="space-y-1">
                  {[
                    'Unlimited daily streaming hours',
                    'Higher bitrate & quality',
                    'Analytics & viewer insights',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-300">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-center text-xs text-slate-500">
                Your limit resets at midnight UTC.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
