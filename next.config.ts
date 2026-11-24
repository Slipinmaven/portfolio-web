import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/v1/auth/:path*",
        destination: `${backendApiUrl}/api/v1/auth/:path*`,
      },
    ];
  },
  experimental: {
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
