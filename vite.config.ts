// vite.config.ts

import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Service Worker Configuration (Development Watch)
export default defineConfig(() => {
  return {
    minify: true,
    plugins: [
      react({
        // Exclude service worker and web worker files from React plugin
        exclude: [/\.ww\.(ts|js)$/, /sw\.(ts|js)$/],
      }),
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
