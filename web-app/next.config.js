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
  // One set of legal pages for the whole product: the studio site's, which
  // the mobile app and both store listings already point to.
  async redirects() {
    return [
      { source: '/privacy', destination: 'https://mosaicstudioapps.com/privacy', permanent: false },
      { source: '/terms', destination: 'https://mosaicstudioapps.com/terms', permanent: false },
      { source: '/cookies', destination: 'https://mosaicstudioapps.com/privacy', permanent: false },
      { source: '/contact', destination: 'https://mosaicstudioapps.com/support', permanent: false },
    ];
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