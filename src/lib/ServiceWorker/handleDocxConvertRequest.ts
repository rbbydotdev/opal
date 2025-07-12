import { convertImage } from "@/lib/createImage";
import { AbsPath, basename, dirname, extname, joinPath, prefix, relPath, strictPathname } from "@/lib/paths2";
import mammoth from "mammoth";
import { SWWStore } from "./SWWStore";

export async function handleDocxConvertRequest(
  workspaceId: string,
  fullPathname: AbsPath,
  file: ArrayBuffer
): Promise<Response> {
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  const fileName = basename(fullPathname);
  const targetDirName = dirname(fullPathname);
  const docName = strictPathname(prefix(fileName));
  const docDirName = `${docName}-docx`;
  const docDir = await workspace.newDir(targetDirName, relPath(docDirName));
  const options = {
    convertImage: mammoth.images.imgElement(function (image) {
      return image.readAsArrayBuffer().then(async (imageBuffer) => {
        const convertedImage = await convertImage({
          imageInput: new Blob([imageBuffer], { type: image.contentType }),
          prefixName: `${docName}-img`,
        });
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
  const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer: file }, options);

  const resultPath = await workspace.newFile(docDir, fileName, markdown);

  return new Response(resultPath, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
