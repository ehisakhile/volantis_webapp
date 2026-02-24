// Random Thumbnail Generator for Audio Streams
// Generates visually appealing gradient thumbnails based on seed strings

interface ThumbnailOptions {
  seed: string;
  size?: { width: number; height: number };
}

interface GeneratedThumbnail {
  dataUrl: string;
  initials: string;
  gradientColors: string[];
}

// Color palettes for different moods
const COLOR_PALETTES = [
  ['#0ea5e9', '#0284c7', '#0369a1'], // Sky blue
  ['#8b5cf6', '#7c3aed', '#6d28d9'], // Violet
  ['#ec4899', '#db2777', '#be185d'], // Pink
  ['#f59e0b', '#d97706', '#b45309'], // Amber
  ['#10b981', '#059669', '#047857'], // Emerald
  ['#ef4444', '#dc2626', '#b91c1c'], // Red
  ['#06b6d4', '#0891b2', '#0e7490'], // Cyan
  ['#6366f1', '#4f46e5', '#4338ca'], // Indigo
];

// Hash function to generate consistent numbers from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get initials from company/stream name
export function getInitials(name: string, maxLength: number = 2): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, maxLength).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Generate gradient colors based on seed
function getGradientColors(seed: string): string[] {
  const hash = hashString(seed);
  const paletteIndex = hash % COLOR_PALETTES.length;
  const colors = COLOR_PALETTES[paletteIndex];
  
  // Shuffle within the palette for variety
  const shuffled = [...colors].sort(() => (hash >> 8) % 2 === 0 ? 1 : -1);
  return shuffled;
}

// Generate random gradient pattern
function getGradientPattern(colors: string[], seed: string): string {
  const hash = hashString(seed);
  const patternType = hash % 4;
  
  switch (patternType) {
    case 0: // Diagonal gradient
      return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
    case 1: // Radial gradient
      return `radial-gradient(circle at ${30 + (hash % 40)}% ${30 + (hash % 40)}%, ${colors[0]}, ${colors[1]} 50%, ${colors[2]})`;
    case 2: // Sweep gradient
      return `conic-gradient(from ${(hash % 360)}deg at 50% 50%, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})`;
    default: // Linear gradient
      return `linear-gradient(to right, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
  }
}

// Generate waveform pattern for audio stream
function getWaveformPattern(ctx: CanvasRenderingContext2D, width: number, height: number, seed: string) {
  const hash = hashString(seed);
  const barCount = 20;
  const barWidth = width / barCount;
  const maxBarHeight = height * 0.8;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  
  for (let i = 0; i < barCount; i++) {
    // Generate pseudo-random height based on seed and position
    const pseudoRandom = Math.sin(hash + i * 0.5) * 0.5 + 0.5;
    const barHeight = maxBarHeight * (0.3 + pseudoRandom * 0.7);
    const x = i * barWidth + barWidth * 0.2;
    const y = (height - barHeight) / 2;
    
    // Rounded bars
    const radius = Math.min(barWidth * 0.4, barHeight * 0.1);
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth * 0.6, barHeight, radius);
    ctx.fill();
  }
}

// Generate a thumbnail image as data URL
export function generateThumbnail(options: ThumbnailOptions): GeneratedThumbnail {
  const { 
    seed, 
    size = { width: 400, height: 300 } 
  } = options;
  
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Get gradient colors and pattern
  const colors = getGradientColors(seed);
  const gradient = getGradientPattern(colors, seed);
  
  // Fill background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size.width, size.height);
  
  // Add waveform visualization
  getWaveformPattern(ctx, size.width, size.height, seed);
  
  // Add initials in the center
  const initials = getInitials(seed);
  const fontSize = Math.min(size.width, size.height) * 0.25;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, size.width / 2, size.height / 2);
  
  // Add subtle overlay for depth
  const overlay = ctx.createLinearGradient(0, 0, 0, size.height);
  overlay.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  overlay.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  overlay.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, size.width, size.height);
  
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.8),
    initials,
    gradientColors: colors,
  };
}

// Generate thumbnail as CSS background style
export function getThumbnailBackground(seed: string): string {
  const colors = getGradientColors(seed);
  const pattern = getGradientPattern(colors, seed);
  const initials = getInitials(seed);
  
  // Return CSS with gradient and centered initials
  return `
    ${pattern}
    background-size: cover;
    background-position: center;
  `;
}

// Memoized thumbnail cache
const thumbnailCache = new Map<string, GeneratedThumbnail>();

export function getCachedThumbnail(seed: string, size?: { width: number; height: number }): GeneratedThumbnail {
  const cacheKey = `${seed}-${size?.width || 400}-${size?.height || 300}`;
  
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }
  
  const thumbnail = generateThumbnail({ seed, size });
  thumbnailCache.set(cacheKey, thumbnail);
  
  // Limit cache size
  if (thumbnailCache.size > 100) {
    const firstKey = thumbnailCache.keys().next().value;
    if (firstKey) {
      thumbnailCache.delete(firstKey);
    }
  }
  
  return thumbnail;
}
