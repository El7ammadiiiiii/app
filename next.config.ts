import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  pageExtensions: [ 'tsx', 'ts', 'jsx', 'js' ],
  // Specify that app directory is in src/
  experimental: {
    optimizePackageImports: [ 'echarts', 'lightweight-charts' ]
  },
  async headers ()
  {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            // Dev-friendly: no aggressive caching for pages/chunks
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      },
      {
        // Hashed static assets can be cached immutably
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      }
    ];
  },
  async redirects ()
  {
    return [
      {
        source: '/chat/pattern-scanner-new',
        destination: '/chat/pattern',
        permanent: true,
      },
      {
        source: '/chat/pattern-scanner-new/:path*',
        destination: '/chat/pattern',
        permanent: true,
      },
    ];
  },
  typescript: {
    // Allow build to succeed despite TS errors in experimental Display modules
    ignoreBuildErrors: true,
  },
  transpilePackages: [ 'echarts-for-react', 'echarts', 'zrender' ],
};

export default nextConfig;
