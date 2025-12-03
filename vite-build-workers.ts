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
  },
  {
    name: "DocxWorker",
    entry: resolve(__dirname, "src/workers/DocxWorker/docx.ww.ts"),
    outFile: "docx.ww.js",
  },
  {
    name: "ImageWorker",
    entry: resolve(__dirname, "src/workers/ImageWorker/image.ww.ts"),
    outFile: "image.ww.js",
  },
  {
    name: "ImageReplaceWorker",
    entry: resolve(__dirname, "src/workers/ImageWorker/imageReplace.ww.ts"),
    outFile: "imageReplace.ww.js",
  },
  {
    name: "ImageWorker3",
    entry: resolve(__dirname, "src/workers/ImageWorker/image3.ww.ts"),
    outFile: "image3.ww.js",
  },
  {
    name: "SearchWorker",
    entry: resolve(__dirname, "src/workers/SearchWorker/search.ww.ts"),
    outFile: "search.ww.js",
  },
  {
    name: "RepoWorker",
    entry: resolve(__dirname, "src/workers/RepoWorker/repo.ww.ts"),
    outFile: "repo.ww.js",
  },
  {
    name: "DiskWorker",
    entry: resolve(__dirname, "src/workers/DiskWorker/disk.ww.ts"),
    outFile: "disk.ww.js",
  },
  {
    name: "WorkspaceWorker",
    entry: resolve(__dirname, "src/workers/WorkspaceWorker/workspace.ww.ts"),
    outFile: "workspace.ww.js",
  },
];

// Helper to create a worker config
interface WorkerConfig {
  name: string;
  entry: string;
  outFile: string;
}

function createWorkerConfig({ name, entry, outFile }: WorkerConfig, isDev: boolean) {
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
      outDir: "public",
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

const BuildList = [
  "ServiceWorker",
  // "SearchWorker",
  // "DocxWorker",
  // "ImageWorker",
  // "ImageReplaceWorker",
  // "ImageWorker3",
  // "RepoWorker",
  // "DiskWorker",
  // "WorkspaceWorker",
];

async function buildAllWorkers(isDev = false) {
  for (const worker of workers) {
    if (!BuildList.includes(worker.name)) {
      console.log(`Skipping build of ${worker.name}`);
      continue;
    }
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
