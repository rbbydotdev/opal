import { Workspace } from "@/Db/Workspace";
import { convertImage } from "@/lib/createImage";
import { renderHtmlToMarkdown } from "@/lib/markdown/renderHtmlToMarkdown";
import { AbsPath, basename, dirname, extname, joinPath, prefix, relPath, strictPathname } from "@/lib/paths2";
import "@/workers/transferHandlers/workspace.th";
import * as Comlink from "comlink";
import mammoth from "mammoth";

async function docxConvert(workspace: Workspace, fullPathname: AbsPath, file: File): Promise<AbsPath> {
  try {
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
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, options);
    const markdown = renderHtmlToMarkdown(html);
    return workspace.newFile(docDir, relPath(`${docNamePrefix}.md`), markdown);
  } catch (e) {
    console.error("Error in docxConvert:", e);
    throw e;
  } finally {
    await new Promise((rs) => setTimeout(rs, 2000)); // Wait a bit to ensure all operations finish
    self.close();
  }
}

export default Comlink.expose(docxConvert);
export type DocxConvertType = typeof docxConvert;
