// vite.config.ts

import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import removeConsole from "vite-plugin-remove-console";
import svgr from "vite-plugin-svgr";

// Service Worker Configuration (Development Watch)
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  return {
    build: {
      assetsDir: "@static",
    },
    minify: true,
    // Disable Hot Module Replacement
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
        // Exclude service worker and web worker files from React plugin
        exclude: [/\.ww\.(ts|js)$/, /sw\.(ts|js)$/],
      }),
      // Only apply the removeConsole plugin in production
      ...(isProd
        ? [
            removeConsole({
              includes: ["log", "debug", "info"], // Keep warn/error visible in PROD if you want
            }),
          ]
        : []),
      // TanStackRouterVite(),
      tanstackRouter({
        routeToken: "layout",
      }),
      // This plugin provides polyfills for Node.js core modules and globals.
      // It handles both development (esbuild) and production (rollup) builds.
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: false,
      }),
      svgr(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      headers: {
        // Allow service workers to control the entire site scope
        "Service-Worker-Allowed": "/",
      },
    },
    preview: {
      headers: {
        // Allow service workers to control the entire site scope in preview mode too
        "Service-Worker-Allowed": "/",
        // "Origin-Agent-Cluster": "?1",
      },
    },
    // The `optimizeDeps` and `build.rollupOptions.plugins` sections
    // for polyfills are no longer needed. The plugin handles it.
    optimizeDeps: {
      exclude: ["fsevents"], // Still a good idea to exclude this
    },
    // The `define` section for process.env is still useful.
    // The plugin will handle polyfilling `process` and `global`.
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      "process.version": JSON.stringify("v18.18.0"),
      // "process.env.PUBLIC_GITHUB_CLIENT_ID": JSON.stringify(process.env.PUBLIC_GITHUB_CLIENT_ID || "unknown"),
    },
  };
});
