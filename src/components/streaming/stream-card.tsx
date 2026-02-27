"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCachedThumbnail } from '@/lib/thumbnail-generator';
import type { VolLivestreamOut } from '@/types/livestream';

interface StreamCardProps {
  stream: VolLivestreamOut;
  onClick?: () => void;
  variant?: 'live' | 'recording';
}

export function StreamCard({ stream, onClick, variant = 'live' }: StreamCardProps) {
  // Determine thumbnail: priority is thumbnail_url > company_logo_url > generated
  const thumbnail = useMemo(() => {
    // Priority 1: Use stream's thumbnail_url if available
    if (stream.thumbnail_url) {
      return {
        dataUrl: stream.thumbnail_url,
        initials: '',
        gradientColors: [],
        isCustomImage: true,
      };
    }
    
    // Priority 2: Use company logo if available
    if (stream.company_logo_url) {
      return {
        dataUrl: stream.company_logo_url,
        initials: '',
        gradientColors: [],
        isCustomImage: true,
      };
    }
    
    // Priority 3: Fall back to generated gradient thumbnail
    return {
      ...getCachedThumbnail(stream.slug),
      isCustomImage: false,
    };
  }, [stream.slug, stream.thumbnail_url, stream.company_logo_url]);

  // Get display initials for fallback avatar
  const displayInitials = useMemo(() => {
    if (stream.company_name) {
      return getInitials(stream.company_name);
    }
    return getInitials(stream.title);
  }, [stream.company_name, stream.title]);

  // Format viewer count
  const formatViewerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Format duration
  const formatDuration = () => {
    if (!stream.start_time) return '';
    const start = new Date(stream.start_time);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:00`;
    }
    return `${mins}:00`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl overflow-hidden",
        "bg-slate-900 border border-slate-800",
        "shadow-lg hover:shadow-2xl transition-shadow duration-300"
      )}
    >
      {/* Thumbnail background */}
      <div 
        className="relative h-40 w-full"
        style={{ backgroundImage: `url(${thumbnail.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        
        {/* LIVE badge */}
        {variant === 'live' && stream.is_active && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="absolute top-3 left-3"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500 text-white text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </motion.div>
        )}
        
        {/* Recording badge */}
        {variant === 'recording' && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700 text-white text-xs font-semibold">
              <Clock className="w-3 h-3" />
              RECORDING
            </span>
          </div>
        )}
        
        {/* Viewer count */}
        {stream.viewer_count > 0 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-xs">
              <Users className="w-3 h-3" />
              {formatViewerCount(stream.viewer_count)}
            </span>
          </div>
        )}
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-white/20 backdrop-blur-sm",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            )}
          >
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </motion.div>
        </div>
        
        {/* Duration (for recordings) */}
        {variant === 'recording' && stream.end_time && (
          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-1 rounded bg-black/50 backdrop-blur-sm text-white text-xs">
              {formatDuration()}
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-white truncate mb-1 group-hover:text-sky-400 transition-colors">
          {stream.title}
        </h3>
        
        {/* Description/Company */}
        {stream.description && (
          <p className="text-sm text-slate-400 truncate mb-2">
            {stream.description}
          </p>
        )}
        
        {/* Meta info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration()}
          </span>
          {stream.created_by_username && (
            <span className="text-slate-600">•</span>
          )}
          {stream.created_by_username && (
            <span>{stream.created_by_username}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default StreamCard;
