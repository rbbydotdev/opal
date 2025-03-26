import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: false,
  maximumFileSizeToCacheInBytes: 15000000,
  include: [/^(?!.*\/icons\/(android|ios)\/).*/],
});

export default withSerwist({
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
});
