import path, { resolve } from "path";
import { fileURLToPath } from "url";
import { build, defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List all your workers here
const workers = [
  {
    name: "ServiceWorker",
    entry: resolve(__dirname, "src/lib/ServiceWorker/sw.ts"),
    outFile: "sw.js",
    outDir: "dist",
  },
  {
    name: "ImageWorker",
    entry: resolve(__dirname, "src/workers/ImageWorker/image.ww.ts"),
    outFile: "image.ww.js",
    outDir: "dist",
  },
  {
    name: "ImageWorker3",
    entry: resolve(__dirname, "src/workers/ImageWorker/image3.ww.ts"),
    outFile: "image3.ww.js",
    outDir: "dist",
  },
  {
    name: "SearchWorker",
    entry: resolve(__dirname, "src/workers/SearchWorker/search.ww.ts"),
    outFile: "search.ww.js",
    outDir: "dist",
  },
  {
    name: "RepoWorker",
    entry: resolve(__dirname, "src/workers/RepoWorker/repo.ww.ts"),
    outFile: "repo.ww.js",
    outDir: "dist",
  },
  {
    name: "DiskWorker",
    entry: resolve(__dirname, "src/workers/DiskWorker/disk.ww.ts"),
    outFile: "disk.ww.js",
    outDir: "dist",
  },
];

// Helper to create a worker config
interface WorkerConfig {
  name: string;
  entry: string;
  outFile: string;
  outDir: string;
}

function createWorkerConfig({ name, entry, outFile, outDir }: WorkerConfig, isDev: boolean) {
  return defineConfig({
    plugins: [
      nodePolyfills({
        protocolImports: false,
      }),
    ],
    build: {
      minify: true,
      lib: {
        entry,
        name,
        fileName: () => outFile,
        formats: ["iife"],
      },
      outDir: isDev ? "public" : outDir,
      emptyOutDir: false, // Don't wipe outDir for each worker
      ...(isDev ? { watch: {} } : {}),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
}

async function buildAllWorkers(isDev = false) {
  for (const worker of workers) {
    const config = createWorkerConfig(worker, isDev);
    await build(config);
    console.log(`${isDev ? "Watching" : "Built"} ${worker.name} -> ${worker.outFile}`);
  }
}

// Usage: node build-workers.js [dev]
const isDev = process.argv.includes("dev");
buildAllWorkers(isDev).catch((err) => {
  console.error(err);
  process.exit(1);
});
