import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Simple redirects for clean URLs
  async redirects() {
    return [
      {
        source: '/course',      // /course → /courses
        destination: '/courses',
        permanent: true,
      },
      {
        source: '/bundle',      // /bundle → /bundles
        destination: '/bundles', 
        permanent: true,
      },
    ]
  },

  // ✅ Image optimization (optional - configure as needed)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn-domain.com', // Replace with your image domain
      },
    ],
  },

  // ✅ NO experimental config needed!
  // ISR is handled by `export const revalidate = 3600` in individual pages
};

export default nextConfig;