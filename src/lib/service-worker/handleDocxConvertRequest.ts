import { convertImage } from "@/lib/createImage";
import { renderHtmlToMarkdown } from "@/lib/markdown/renderHtmlToMarkdown";
import { absPath, basename, dirname, extname, joinPath, prefix, relPath, strictPathname } from "@/lib/paths2";
import { SWWStore } from "@/lib/service-worker/SWWStore";
import mammoth from "mammoth";

export async function handleDocxConvertRequest(workspaceId: string, fullPathname: string, arrayBuffer: ArrayBuffer) {
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  const fileName = basename(absPath(fullPathname));
  const targetDirName = dirname(absPath(fullPathname));
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
  return await workspace.newFile(docDir, relPath(`${docNamePrefix}.md`), markdown);
}
