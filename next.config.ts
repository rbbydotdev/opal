import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole: false,
  },
  reactStrictMode: false,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
