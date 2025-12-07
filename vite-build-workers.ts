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
    entry: resolve(__dirname, "src/lib/service-worker/sw.ts"),
    outFile: "sw.js",
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
    define: {
      __ENABLE_LOG__: JSON.stringify(true),
      __LOG_LEVEL__: JSON.stringify("debug"),
    },
  });
}

const BuildList = ["ServiceWorker"];

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
