import { createImage } from "@/lib/createImage";
import { absPath, extname, joinPath, prefix, relPath } from "@/lib/paths2";
import mammoth from "mammoth";
import { strictPathname } from "../paths2";
import { SWWStore } from "./SWWStore";

export async function handleDocxConvertRequest(workspaceId: string, files: File[]): Promise<Response> {
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  const results: Array<{ pathname: string }> = [];

  for (const file of files) {
    const docName = strictPathname(prefix(file.name));
    const docDirName = `${docName}-docx`;
    /* TOOD root dir for now*/
    const docDir = await workspace.newDir(absPath("/"), relPath(docDirName));
    const arrayBuffer = await file.arrayBuffer();
    const options = {
      convertImage: mammoth.images.imgElement(function (image) {
        return image.readAsArrayBuffer().then(async (imageBuffer) => {
          // const ext = image.contentType.split("/")[1];
          const convertedImage = await createImage({ file: new Blob([imageBuffer], { type: image.contentType }) });
          const resultPath = await workspace.newFile(
            joinPath(docDir, "/images"),
            relPath(`${docName}-img${extname(convertedImage.name)}`),
            convertedImage
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
