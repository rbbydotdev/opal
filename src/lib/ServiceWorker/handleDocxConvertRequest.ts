import { absPath, joinPath, prefix, relPath } from "@/lib/paths2";
import mammoth from "mammoth";
import { strictPathname } from "../paths2";
import { SWWStore } from "./SWWStore";

export async function handleDocxConvertRequest(workspaceId: string, files: File[]): Promise<Response> {
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  const results: Array<{ pathname: string }> = [];

  for (const file of files) {
    const docDir = await workspace.newDir(
      absPath("/") /* TOOD root dir for now*/,
      relPath(strictPathname(prefix(file.name)))
    );
    // 2. Convert DOCX to Markdown, extracting images as base64
    const arrayBuffer = await file.arrayBuffer();
    const options = {
      convertImage: mammoth.images.imgElement(function (image) {
        return image.readAsArrayBuffer().then(async (imageBuffer) => {
          // return image.read("base64").then(async (imageBuffer) => {
          // Save image to workspace (optional)
          const ext = image.contentType.split("/")[1];
          // Save image as base64 or Blob in your workspace
          const resultPath = await workspace.newFile(
            joinPath(docDir, "/images"),
            // relPath(`${file.name}-${Date.now()}.${ext}`),
            relPath(`${prefix(file.name)}-img.${ext}`),
            new Uint8Array(imageBuffer)
          );
          // Return Markdown image reference
          return { src: resultPath };
        });
      }),
    };
    const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer }, options);

    // 3. Save Markdown file to workspace
    const _resultPath = await workspace.newFile(docDir, relPath(file.name.replace(/\.docx$/i, ".md")), markdown);

    results.push({ pathname: docDir });
  }

  // 4. Return a JSON response with the results
  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
      Pragma: "no-cache",
    },
  });
}
