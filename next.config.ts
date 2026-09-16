import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/jobs": ["./bin/ffmpeg"],
  },
};

export default nextConfig;
