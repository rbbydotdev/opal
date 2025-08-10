import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
export default defineConfig({
  plugins: [
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: false,
    }),
  ],
  build: {
    lib: {
      entry: "src/lib/ServiceWorker/sw.ts",
      formats: ["iife"], // IIFE for importScripts compatibility
      name: "ServiceWorker",
      fileName: () => "sw.bundle.js",
    },
    outDir: "dist/sw",
    minify: true,
    emptyOutDir: false,
    rollupOptions: {
      plugins: [visualizer({ open: true })], // <-- Add this line
    },
  },
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
});
