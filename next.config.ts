const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole: false,
  },
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.alias["decode-named-character-reference"] = require.resolve(
  //       "decode-named-character-reference/index.js"
  //     );
  //   }
  //   return config;
  // },
  reactStrictMode: false,
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
