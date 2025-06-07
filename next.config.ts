// import withSerwistInit from "@serwist/next";

// const withSerwist = withSerwistInit({
//   swSrc: "src/app/sw.ts",
//   swDest: "public/sw.js",
//   reloadOnOnline: false,
//   maximumFileSizeToCacheInBytes: 15000000,
//   include: [/^(?!.*\/icons\/(android|ios)\/).*/],
// });

const config = {
  // webpack(config: { devtool: string }, { dev }: unknown) {
  //   if (dev) {
  //     config.devtool = "source-map";
  //   }
  //   return config;
  // },
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
