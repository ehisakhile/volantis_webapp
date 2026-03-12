import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-NG').format(num);
}

export function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

export function getInitials(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Pre-defined gradient pairs for avatars (Tailwind colors)
const AVATAR_GRADIENTS = [
  ['from-sky-500', 'to-violet-500'],
  ['from-rose-500', 'to-orange-400'],
  ['from-emerald-500', 'to-teal-400'],
  ['from-amber-500', 'to-red-500'],
  ['from-purple-500', 'to-pink-500'],
  ['from-cyan-500', 'to-blue-500'],
  ['from-lime-500', 'to-green-500'],
  ['from-indigo-500', 'to-purple-500'],
];

// Pre-defined solid colors for usernames (matching the gradients)
const USERNAME_COLORS = [
  'text-sky-400',
  'text-rose-400',
  'text-emerald-400',
  'text-amber-500',
  'text-purple-400',
  'text-cyan-400',
  'text-lime-500',
  'text-indigo-400',
];

export interface UserColors {
  gradient: string[];
  color: string;
}

/**
 * Generate consistent random colors based on username hash.
 * Each username will always get the same color pair.
 */
export function getUserColors(username: string): UserColors {
  if (!username) {
    return { gradient: AVATAR_GRADIENTS[0], color: USERNAME_COLORS[0] };
  }
  // Generate consistent index based on username hash
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return {
    gradient: AVATAR_GRADIENTS[index],
    color: USERNAME_COLORS[index],
  };
}