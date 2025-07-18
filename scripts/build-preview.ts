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
    alias: {
      "@": path.resolve(appDir, "src/"),
    },
    plugins: [
      stylePlugin({
        // css: {
        //   inject: true,
        // },
      }),
    ],
    metafile: true,
  });

  // await fs.writeFile("meta.json", JSON.stringify(result.metafile));
  // --- SIMPLIFIED LOGIC ---
  // The `result.outputFiles` array will now contain only ONE file:
  // the fully bundled JavaScript (which also contains the CSS).
  const jsContent: string = result.outputFiles?.[0]?.text ?? "";
  // const jsContent = "/* okay */";

  // Read the HTML template
  const template: string = await fs.readFile("./preview-builder/preview-template.html", "utf-8");

  const outdir = path.resolve(appDir, "public");
  await fs.mkdir(outdir, { recursive: true });
  await fs.writeFile(
    path.join(outdir, "doc-preview-image.html"),
    template.split(MAGIC_STRING).join(`<script>${jsContent}</script>`)
  );

  console.log("✅ Single-file preview page built successfully to public/doc-preview-image.html");
}

build().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
