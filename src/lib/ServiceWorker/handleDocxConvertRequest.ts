import { convertImage } from "@/lib/createImage";
import { renderHtmlToMarkdown } from "@/lib/markdown/renderHtmlToMarkdown";
import { AbsPath, basename, dirname, extname, joinPath, prefix, relPath, strictPathname } from "@/lib/paths2";
import mammoth from "mammoth";
import { SWWStore } from "./SWWStore";

export async function handleDocxConvertRequest(
  workspaceId: string,
  fullPathname: AbsPath,
  arrayBuffer: ArrayBuffer
): Promise<Response> {
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  const fileName = basename(fullPathname);
  const targetDirName = dirname(fullPathname);
  const docNamePrefix = strictPathname(prefix(fileName));
  const docDirName = `${docNamePrefix}-docx`;
  const docDir = await workspace.newDir(targetDirName, relPath(docDirName));
  const options = {
    convertImage: mammoth.images.imgElement(function (image) {
      return image.readAsArrayBuffer().then(async (imageBuffer) => {
        const convertedImage = await convertImage({
          imageInput: new Blob([imageBuffer], { type: image.contentType }),
          prefixName: `${docNamePrefix}-img`,
        });
        const resultPath = await workspace.newFile(
          joinPath(docDir, "/images"),
          relPath(`${docNamePrefix}-img${extname(convertedImage.name)}`),
          convertedImage
        );
        // Return Markdown image reference
        return { src: resultPath };
      });
    }),
  };

  const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, options);
  const markdown = renderHtmlToMarkdown(html);
  const resultPath = await workspace.newFile(docDir, relPath(`${docNamePrefix}.md`), markdown);

  return new Response(resultPath, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
