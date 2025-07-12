import { Workspace } from "@/Db/Workspace";
// import * as mammoth from "mammoth/mammoth.browser"; // Use the browser build
import mammoth from "mammoth"; // Use the browser build
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
      convertImage: mammoth.images.inline(function (image) {
        return image.read("base64").then((imageBuffer) => {
          // Save image to workspace (optional)
          const ext = image.contentType.split("/")[1];
          const imageName = `${file.name}-${Date.now()}.${ext}`;
          const imagePath = `images/${imageName}`;
          // Save image as base64 or Blob in your workspace
          workspace.saveFile(imagePath, imageBuffer, { base64: true });
          // Return Markdown image reference
          return { src: imagePath };
        });
      }),
    };
    const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer }, options);

    // 3. Save Markdown file to workspace
    const mdName = file.name.replace(/\.docx$/i, ".md");
    await workspace.saveFile(mdName, markdown);

    results.push({ name: mdName, markdown });
  }

  // 4. Return a JSON response with the results
  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
