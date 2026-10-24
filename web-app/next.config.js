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
  // One set of legal pages for the whole product, on the studio site. Coin
  // Odyssey's own documents cover the apps and the website together.
  async redirects() {
    return [
      { source: '/privacy', destination: 'https://mosaicstudioapps.com/privacy/coin-odyssey', permanent: false },
      { source: '/terms', destination: 'https://mosaicstudioapps.com/terms/coin-odyssey', permanent: false },
      { source: '/cookies', destination: 'https://mosaicstudioapps.com/privacy/coin-odyssey', permanent: false },
      { source: '/contact', destination: 'https://mosaicstudioapps.com/support', permanent: false },
    ];
  },
  // Security headers, here rather than in vercel.json so they apply on any host.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The camera is for the scan page's webcam option, on this site only.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 