import type { NextConfig } from "next";

const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'volantislive.com';

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.volantislive.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.volantislive.com',
      },
      {
        protocol: 'https',
        hostname: 'api-dev.volantislive.com',
      },
      {
        protocol: 'https',
        hostname: 'api.volantislive.com',
      },
    ],
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api-dev.volantislive.com/:path*',
      },
    ];
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Domain',
            value: baseDomain,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
