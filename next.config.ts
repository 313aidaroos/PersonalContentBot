import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/jobs": ["./bin/ffmpeg"],
    // /api/health spawns `ffmpeg -version` to report the real engine status.
    "/api/health": ["./bin/ffmpeg"],
  },
};

export default nextConfig;
