import fs from "fs/promises";
import path from "path";
import { build } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const MAGIC_STRING = `<!--__SCRIPT_INJECT_PLACEHOLDER__-->`;
const appDir: string = process.cwd();

async function buildPreview(): Promise<void> {
  console.log("Building single-file preview page with Vite...");

  const result = await build({
    // Entry point
    build: {
      lib: {
        entry: path.resolve(appDir, "preview-builder/src/preview-entry.ts"),
        name: "PreviewApp",
        fileName: "preview-app",
        formats: ["iife"],
      },
      outDir: path.resolve(appDir, "dist/preview-temp"),
      minify: true,
      write: true,
      rollupOptions: {
        output: {
          // Single file output
          inlineDynamicImports: true,
          manualChunks: undefined,
        },
      },
    },
    // Use same plugins as main config
    plugins: [
      nodePolyfills({
        protocolImports: false,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(appDir, "src"),
      },
    },
    define: {
      __ENABLE_LOG__: JSON.stringify(true),
      __LOG_LEVEL__: `"debug"`,
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  });

  // Read the generated JS
  const jsContent = await fs.readFile(path.resolve(appDir, "dist/preview-temp/preview-app.iife.js"), "utf-8");

  // Read template
  const template = await fs.readFile("./preview-builder/preview-template.html", "utf-8");

  // Create output directory
  const outdir = path.resolve(appDir, "public");
  await fs.mkdir(outdir, { recursive: true });

  // Write final HTML file
  await fs.writeFile(
    path.join(outdir, "doc-preview-image.html"),
    template.split(MAGIC_STRING).join(`<script>${jsContent}</script>`)
  );

  // Clean up temp directory
  await fs.rm(path.resolve(appDir, "dist/preview-temp"), { recursive: true });

  console.log("Single-file preview page built successfully to public/doc-preview-image.html");
}

buildPreview().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
