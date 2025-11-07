import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mtgqigiiofcsldvlxnuz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Increase request body size limit for multimodal chat (images)
  // Default Vercel limit: 4.5MB (causes 413 errors with 3+ images)
  // Increased to 10MB to support multiple compressed images
  // Reference: https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#request-body-size
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Also configure for API routes
  // Note: This is applied at the route level in route.ts files
  serverExternalPackages: [],
};

export default nextConfig;
