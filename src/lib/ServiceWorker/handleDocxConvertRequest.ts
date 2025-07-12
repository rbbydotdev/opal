import { Workspace } from "@/Db/Workspace";
// import * as mammoth from "mammoth/mammoth.browser"; // Use the browser build
import { absPath, relPath } from "@/lib/paths2";
import mammoth from "mammoth/mammoth.browser";
import { SWWStore } from "./SWWStore";

export async function handleDocxConvertRequest(event: FetchEvent): Promise<Response> {
  const referrerPath = new URL(event.request.referrer).pathname;
  const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
  if (!workspaceId) {
    return fetch(event.request);
  }
  const workspace = await SWWStore.tryWorkspace(workspaceId);

  // 1. Parse incoming files (assuming multipart/form-data)
  const formData = await event.request.formData();
  const files: File[] = [];
  for (const entry of formData.values()) {
    if (entry instanceof File) files.push(entry);
  }

  const results: Array<{ name: string; markdown: string }> = [];

  for (const file of files) {
    // 2. Convert DOCX to Markdown, extracting images as base64
    const arrayBuffer = await file.arrayBuffer();
    const options = {
      convertImage: mammoth.images.imgElement(function (image) {
        return image.read("base64").then(async (imageBuffer) => {
          // Save image to workspace (optional)
          const ext = image.contentType.split("/")[1];
          // Save image as base64 or Blob in your workspace
          const resultPath = await workspace.newFile(
            absPath("/images"),
            relPath(`${file.name}-${Date.now()}.${ext}`),
            imageBuffer
          );
          // Return Markdown image reference
          return { src: resultPath };
        });
      }),
    };
    const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer }, options);

    // 3. Save Markdown file to workspace
    const resultPath = await workspace.newFile(
      absPath("/doc"),
      relPath(file.name.replace(/\.docx$/i, ".md")),
      markdown
    );

    results.push({ name: resultPath, markdown });
  }

  // 4. Return a JSON response with the results
  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
      Pragma: "no-cache",
    },
  });
}
