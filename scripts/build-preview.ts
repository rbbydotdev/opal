import esbuild, { BuildResult, Metafile } from "esbuild";
import stylePlugin from "esbuild-style-plugin";
import fs from "fs/promises";
import path from "path";

const MAGIC_STRING = `<!--__SCRIPT_INJECT_PLACEHOLDER__-->`;
const appDir: string = process.cwd();

async function build(): Promise<void> {
  console.log("Building single-file preview page with esbuild...");

  const result: BuildResult & { metafile: Metafile } = await esbuild.build({
    entryPoints: ["./preview-builder/src/preview-entry.ts"],
    bundle: true,
    write: false, // Keep output in memory
    minify: true,
    format: "iife",
    target: "es2020",
    platform: "browser",
    outdir: path.resolve(appDir, "public"),
    alias: {
      "@": path.resolve(appDir, "src/"),
    },
    define: {
      // __ENABLE_LOG__: JSON.stringify(process.env.NODE_ENV === "development" || process.env.ENABLE_LOG === "true"),
      // __LOG_LEVEL__: JSON.stringify(process.env.NODE_ENV === "production" ? "warn" : "debug"),
      __ENABLE_LOG__: JSON.stringify(true),
      __LOG_LEVEL__: JSON.stringify("debug"),
    },
    external: ["path", "fs", "os"],
    plugins: [
      stylePlugin({
        css: {
          inject: true,
        },
      }),
    ],
    metafile: true,
  });

  const jsContent: string = result.outputFiles?.[0]?.text ?? "";
  const template: string = await fs.readFile("./preview-builder/preview-template.html", "utf-8");

  const outdir = path.resolve(appDir, "public");
  await fs.mkdir(outdir, { recursive: true });
  await fs.writeFile(
    path.join(outdir, "doc-preview-image.html"),
    template.split(MAGIC_STRING).join(`<script>${jsContent}</script>`)
  );

  console.log("Single-file preview page built successfully to public/doc-preview-image.html");
}

build().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
