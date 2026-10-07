import { assertValidEnv } from './lib/env.schema.js';

// Fail the build (and dev server) early on a bad environment; .env files are loaded by now.
assertValidEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Cost lever: we ship pre-sized WebP/SVG assets instead of paying for image optimisation.
  images: { unoptimized: true },
  // Static export ('export') stays possible because there are no API routes or server actions;
  // enable it with NEXT_OUTPUT=export when moving hosting to Cloudflare Pages or S3 + CloudFront.
  ...(process.env.NEXT_OUTPUT === 'export' ? { output: 'export' } : {}),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
