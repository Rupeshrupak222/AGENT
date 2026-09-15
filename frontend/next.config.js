/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_WS_URL:  process.env.NEXT_PUBLIC_WS_URL  || "ws://localhost:3001",
  },
  async rewrites() {
    return [
      { source: "/dashboard/phone-numbers", destination: "/dashboard/numbers" },
      { source: "/dashboard/knowledge-base", destination: "/dashboard/knowledge" },
    ];
  },
};

module.exports = nextConfig;
