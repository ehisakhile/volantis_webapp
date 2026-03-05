'use client';

import Link from 'next/link';
import { Crown, AlertCircle, X } from 'lucide-react';

interface SubscriptionLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reason: string;
  action: 'stream' | 'upload';
}

export function SubscriptionLimitModal({
  isOpen,
  onClose,
  title,
  reason,
  action,
}: SubscriptionLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
          {title}
        </h2>

        {/* Reason */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{reason}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-600 text-center mb-6">
          Upgrade your plan to {action === 'stream' ? 'unlimited streaming' : 'upload more recordings'} and unlock the full potential of your channel.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/upgrade"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            <Crown className="w-5 h-5" />
            Upgrade Plan
          </Link>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-slate-500 mt-4">
          Have questions?{' '}
          <Link href="/contact" className="text-sky-600 hover:underline font-medium">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SubscriptionLimitModal;
