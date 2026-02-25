"use client";

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Clock, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreatorNotStreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName?: string;
  streamTitle?: string;
  scheduledTime?: string;
  onNotifyMe?: () => void;
}

/**
 * Modal displayed when a user tries to play a stream but the creator is not streaming
 * This is shown when we receive a 409 conflict response from the WebRTC playback endpoint
 */
export function CreatorNotStreamingModal({
  isOpen,
  onClose,
  creatorName = 'The Creator',
  streamTitle,
  scheduledTime,
  onNotifyMe,
}: CreatorNotStreamingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {/* Header with animated icon */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-100 px-6 pt-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-100 mb-4">
                <Radio className="w-8 h-8 text-sky-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {creatorName} is Not Streaming
              </h2>
              <p className="text-gray-600">
                The live stream hasn't started yet. Check back soon!
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {streamTitle && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Stream Title</p>
                  <p className="font-semibold text-gray-900">{streamTitle}</p>
                </div>
              )}

              {scheduledTime && (
                <div className="flex items-center gap-3 mb-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800">Scheduled Start</p>
                    <p className="font-medium text-amber-900">{scheduledTime}</p>
                  </div>
                </div>
              )}

              {/* Info message */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-5">
                <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Stay tuned! You'll be able to listen once the creator starts streaming.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {onNotifyMe && (
                  <Button
                    variant="primary"
                    onClick={onNotifyMe}
                    className="flex-1"
                  >
                    Notify Me
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  {onNotifyMe ? 'Close' : 'OK'}
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Want to start your own stream?{' '}
                <a
                  href="/creator/stream"
                  className="text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1"
                >
                  Go Live <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CreatorNotStreamingModal;