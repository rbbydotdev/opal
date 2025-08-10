// vite.config.ts

import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react({
      // Exclude service worker and web worker files from React plugin
      exclude: [/\.ww\.(ts|js)$/, /sw\.(ts|js)$/],
    }),
    // TanStackRouterVite(),
    tanstackRouter(),
    // This plugin provides polyfills for Node.js core modules and globals.
    // It handles both development (esbuild) and production (rollup) builds.
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: false,
    }),
  ],
  resolve: {
    alias: {
      // Your existing aliases
      "@": path.resolve(__dirname, "./src"),

      // Polyfills for node builtins are handled by `vite-plugin-node-polyfills`
      // You don't need to specify them manually here.
      // stream: "stream-browserify",
      // path: "path-browserify",
      // crypto: "crypto-browserify",
    },
  },
  server: {
    port: 3000,
    headers: {
      // Allow service workers to control the entire site scope
      "Service-Worker-Allowed": "/",
    },
    hmr: false,
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
  },
  // Web Workers and Service Workers configuration
  worker: {
    // format: "es", // Use ESM format for workers
    format: "iife", // Use IIFE format for compatibility
    plugins: () => [
      // Workers also need the same plugins for TypeScript and polyfills
      nodePolyfills({
        protocolImports: false,
      }),
    ],
  },
  // Service Worker specific configuration
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        sw: "src/lib/ServiceWorker/sw.ts", // Build service worker separately
      },
      output: {
        // Ensure service worker is built as a separate entry
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "sw" ? "sw.js" : "assets/[name]-[hash].js";
        },
      },
    },
  },
});
