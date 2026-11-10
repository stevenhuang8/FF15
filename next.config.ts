import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const isDev = process.env.NODE_ENV === "development";
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// None of these restrict the app's own scripts or requests
const baseCspDirectives = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  // Stops injected markdown images from leaking data through their URLs
  `img-src 'self' data: blob: ${supabaseOrigin}`,
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: baseCspDirectives.join("; ") },
];

// To enforce: rename the header below to Content-Security-Policy once the live
// site's browser console shows no violations.
const fullCsp = [
  ...baseCspDirectives,
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // wss: is Supabase Realtime, blob: and data: read chat image attachments
  `connect-src 'self' blob: data: ${supabaseOrigin} ${supabaseOrigin.replace(/^http/, "ws")}${isDev ? " ws:" : ""}`,
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Skips the service worker, whose own fetches would be limited by connect-src
      {
        source: "/((?!sw\\.js).*)",
        headers: [{ key: "Content-Security-Policy-Report-Only", value: fullCsp }],
      },
    ];
  },

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

export default withPWA(nextConfig);
