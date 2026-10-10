/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile shared workspace package
  transpilePackages: ['@coin-collecting/shared'],
  // Enable static optimization where possible
  reactStrictMode: true,
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : 'jyclijzuinhubtigjtfp.supabase.co',
        port: '',
        // Coin photos are in a private bucket and load through signed URLs.
        pathname: '/storage/v1/object/sign/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig; 