import type { NextConfig } from "next";
const config: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole: false,
  },
  experimental: {
    reactCompiler: true,
    reactRoot: "concurrent",
    // reactMode: 'concurrent',
  },
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Use a wildcard to match any service worker file
        source: "/:path*.js", // This matches any .js file at the root level
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/", // Allow the service worker to control the entire site
          },
        ],
      },
    ];
  },
};

export default config;
