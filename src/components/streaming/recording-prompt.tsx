"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
  CircleDot,
  X,
  Upload,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';

interface RecordingPromptProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onAcceptWithAutoUpload?: () => void;
}

export function RecordingPrompt({ isOpen, onAccept, onDecline, onAcceptWithAutoUpload }: RecordingPromptProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <CircleDot className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Record Your Stream</h2>
                <p className="text-sm text-slate-400">Capture your livestream for later</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 mb-6">
              <p className="text-slate-300 text-sm">
                Would you like to record your livestream? Choose an option below:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Save a copy to your device automatically</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Upload for viewers to replay on-demand</span>
                </li>
              </ul>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">
                  Recording starts automatically when you go live and stops when you end the stream.
                  The recording captures the same audio being sent to your audience.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Auto-upload option - Primary */}
              {onAcceptWithAutoUpload && (
                <Button
                  onClick={onAcceptWithAutoUpload}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Record & Auto-Upload (Recommended)
                </Button>
              )}
              
              {/* Save locally only option */}
              <Button
                onClick={onAccept}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                <HardDrive className="w-4 h-4 mr-2" />
                Record & Save Locally Only
              </Button>
              
              {/* Skip option */}
              <Button
                variant="outline"
                onClick={onDecline}
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <X className="w-4 h-4 mr-2" />
                Do not Record
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface RecordingStatusProps {
  isRecording: boolean;
  recordingDuration: number;
  recordedBlob: Blob | null;
  recordedFilename: string | null;
  isUploading: boolean;
  uploadProgress: number;
  isUploaded: boolean;
  onDownload: () => void;
  onUpload: () => void;
  error: string | null;
}

export function RecordingStatus({
  isRecording,
  recordingDuration,
  recordedBlob,
  recordedFilename,
  isUploading,
  uploadProgress,
  isUploaded,
  onDownload,
  onUpload,
  error,
}: RecordingStatusProps) {
  const hasRecording = recordedBlob !== null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Recording Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-400">Recording</span>
            </>
          ) : hasRecording ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-green-400">Recording Complete</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-slate-500 rounded-full" />
              <span className="text-sm font-medium text-slate-400">Recording Off</span>
            </>
          )}
        </div>

        {isRecording && (
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            {formatDuration(recordingDuration)}
          </div>
        )}
      </div>

      {/* Recording Info */}
      {hasRecording && (
        <div className="bg-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span className="truncate">{recordedFilename}</span>
          </div>
          <div className="text-xs text-slate-500">
            Size: {formatFileSize(recordedBlob.size)} • Duration: {formatDuration(recordingDuration)}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Processing for replay...</span>
            <span className="text-slate-300">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {hasRecording && !isUploading && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <HardDrive className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            size="sm"
            onClick={onUpload}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Make Available for Replay
          </Button>
        </div>
      )}

      {/* Upload Success - show when recording has been uploaded/made available for replay */}
      {!isUploading && !error && isUploaded && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          Recording is now available for on-demand replay. Your audience can listen anytime.
        </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default RecordingPrompt;