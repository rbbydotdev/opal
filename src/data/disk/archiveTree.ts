import { FileTree } from "@/components/filetree/Filetree";
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { NotFoundError } from "@/lib/errors/errors";
import { absPath, AbsPath, addTrailingSlash, joinPath, resolveFromRoot } from "@/lib/paths2";
import * as fflate from "fflate";

export async function archiveTree({
  fileTree,
  onFileError,
  onFileProcessed,
  prefixPath = absPath("/archive"),
  scope = absPath("/"),
}: {
  fileTree: FileTree;
  onFileError?: (error: Error, filePath: string) => void;
  onFileProcessed?: (filePath: string, fileCount: number, total: number) => void;
  prefixPath: AbsPath;
  scope?: AbsPath;
}): Promise<ReadableStream<any>> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Set up the ZIP stream
  const zip = new fflate.Zip(async (err, data, final) => {
    if (err) {
      await writer.abort(err);
      return;
    }
    await writer.write(data);
    if (final) await writer.close();
  });

  const allFiles = [...fileTree.iterator(FilterOutSpecialDirs)];
  let fileCount = allFiles.filter((node) => node.isTreeFile()).length;
  const total = fileCount;
  if (fileCount === 0) {
    throw new NotFoundError("No files to bundle");
  }

  await Promise.all(
    allFiles.map(async (node) => {
      if (node.isTreeFile()) {
        try {
          const fileStream = new fflate.ZipDeflate(
            addTrailingSlash(joinPath(prefixPath, resolveFromRoot(scope, node.path))),
            { level: 9 }
          );
          zip.add(fileStream);
          void node
            .read()
            .then((data) => {
              fileStream.push(coerceUint8Array(data), true);
            })
            .finally(() => {
              fileCount--;
              onFileProcessed?.(node.path, fileCount, total);
            });
        } catch (e) {
          onFileError?.(e as Error, node.path);
        }
      } else if (node.type === "dir") {
        const emptyDir = new fflate.ZipPassThrough(
          addTrailingSlash(joinPath(prefixPath, resolveFromRoot(scope, node.path)))
        );
        zip.add(emptyDir);
        emptyDir.push(new Uint8Array(0), true);
      }
    })
  );

  zip.end();

  return readable;
}
