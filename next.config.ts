import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow localtunnel and local IP for mobile testing without cross-origin blocking
  allowedDevOrigins: [
    "*.loca.lt",
    "pill-lens-test.loca.lt",
    "192.168.0.2:3000",
    "192.168.0.2",
    "localhost:3000",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
