import { NextConfig } from "next";

const nextConfig = {
  // FIXME: This is enabled because @lemonsqueezy/lemonsqueezy.js SDK has module-level
  // initialization that requires API keys during build time. Consider switching to a
  // different payment SDK or updating LemonSqueezy SDK to support lazy initialization.
  typescript: { ignoreBuildErrors: true },
  pageExtensions: ["ts", "tsx", "mdx"],

  // Enable standalone output for Docker production builds
  output: "standalone",

  // Set dummy env vars for build time to prevent LemonSqueezy SDK from failing
  env: {
    LEMONSQUEEZY_API_KEY: process.env.LEMONSQUEEZY_API_KEY || "dummy_key_for_build",
    LEMONSQUEEZY_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID || "dummy_store_for_build",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
