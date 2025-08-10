// vite.config.ts

import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import path, { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, UserConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Service Worker Configuration (Production Build)
const buildSwConfig: UserConfig = {
  plugins: [
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: false,
    }),
    visualizer(), // Add visualizer as the last plugin
  ],
  build: {
    minify: true,
    lib: {
      entry: resolve(__dirname, "src/lib/ServiceWorker/sw.ts"),
      name: "ServiceWorker",
      fileName: () => "sw.js",
      formats: ["iife"],
    },
    outDir: "dist",
    emptyOutDir: false,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

// Service Worker Configuration (Development Watch)
const devSwConfig: UserConfig = {
  plugins: [
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: false,
    }),
  ],
  build: {
    // plugin
    lib: {
      entry: resolve(__dirname, "src/lib/ServiceWorker/sw.ts"),
      name: "ServiceWorker",
      fileName: () => "sw.js",
      formats: ["iife"],
    },
    // Output to the public directory so the dev server can serve it
    outDir: "public",
    emptyOutDir: false,
    // Enable watch mode
    watch: {},
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

export default defineConfig(() => {
  if (process.env.BUILD_SW) {
    console.log("Building Service Worker for Production...");
    return buildSwConfig;
  } else if (process.env.DEV_SW) {
    console.log("Watching Service Worker for Development...");
    return devSwConfig;
  }
  console.log("Running/Building Application...");
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
  };
});
