import { TreeNode } from "@/components/filetree/TreeNode";
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { isError, NotFoundError } from "@/lib/errors/errors";
import { absPath, joinPath, strictPathname } from "@/lib/paths2";
import { EncHeader, PassHeader } from "@/lib/service-worker/downloadEncryptedZipHelper";
import { REQ_SIGNAL } from "@/lib/service-worker/request-signal-types";
import { signalRequest } from "@/lib/service-worker/utils";
import { BlobWriter, Uint8ArrayReader, ZipWriter, ZipWriterConstructorOptions } from "@zip.js/zip.js";
import { normalize } from "path";
import { SWWStore } from "./SWWStore";

export interface DownloadOptions {
  password: string;
  encryption: "aes" | "zipcrypto";
}
export async function handleDownloadRequestEncrypted(workspaceName: string, event: FetchEvent): Promise<Response> {
  const workspaceDirName = absPath(strictPathname(workspaceName));
  const options: DownloadOptions = {
    password: event.request.headers.get(PassHeader)!,
    encryption: event.request.headers.get(EncHeader)! as "aes" | "zipcrypto",
  };

  try {
    const { password, encryption } = options;
    const zipWriterOptions: ZipWriterConstructorOptions = {
      bufferedWrite: true, // Recommended for better performance with large files
    };

    zipWriterOptions.password = password;
    if (encryption === "zipcrypto") {
      zipWriterOptions.zipCrypto = true;
    } else {
      // zip.js uses encryptionStrength for AES. 3 for AES-256
      zipWriterOptions.encryptionStrength = 3; // AES-256
    }

    const workspace = await SWWStore.tryWorkspace(workspaceName);

    // zip.js ZipWriter takes a WritableStreamDefaultWriter or a WritableStream
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"), zipWriterOptions);

    await workspace.getDisk().fileTree.index();
    const fileNodes = [...workspace.getDisk().fileTree.iterator(FilterOutSpecialDirs)] as TreeNode[];

    if (!fileNodes || fileNodes.length === 0) {
      console.log("{EncZip}: No files found in the workspace to download.");
      // Ensure the zipWriter is closed even if no files, to prevent hanging the stream
      await zipWriter.close();
      return new Response("No files to download", { status: 404 });
    }

    signalRequest({ type: REQ_SIGNAL.START });

    const addFilePromises = fileNodes
      .filter((node) => node.isTreeFile())
      .map(async (node) => {
        try {
          const data = await workspace.getDisk().readFile(node.path);
          await zipWriter.add(
            joinPath(workspaceDirName, node.path),
            new Uint8ArrayReader(coerceUint8Array(data)),
            {
              useWebWorkers: false,
            }
            // No need to pass password/encryption here if set on ZipWriter constructor
          );

          return { status: "fulfilled", path: node.path }; // Indicate success
        } catch (e) {
          console.error(`{EncZip}: [ZIP Error] Failed to add file to zip: ${node.path}`, e);
          return { status: "rejected", path: node.path, reason: e }; // Indicate failure
        }
      });

    // Explicitly add empty directories if they don't contain files that will be added.
    // If a directory is part of a file's path (e.g., 'foo/bar/file.txt'),
    // zip.js will automatically create 'foo/' and 'foo/bar/' entries.
    // This part is mostly for truly empty directories you want to appear.
    const addDirPromises = fileNodes
      .filter((node) => node.type === "dir")
      .map(async (node) => {
        try {
          // Add a 0-byte entry with a trailing slash to represent an empty directory
          await zipWriter.add(
            normalize(joinPath(workspaceDirName, node.path) + "/"),
            new Uint8ArrayReader(new Uint8Array(0))
          );

          return { status: "fulfilled", path: node.path };
        } catch (e) {
          console.error(`{EncZip}: [ZIP Error] Failed to add directory: ${node.path}`, e);
          return { status: "rejected", path: node.path, reason: e };
        }
      });

    const results = await Promise.allSettled([...addFilePromises, ...addDirPromises]);

    const rejectedFiles = results.filter((result) => result.status === "rejected");
    if (rejectedFiles.length > 0) {
      console.error("{EncZip}: [ZIP Error] Some files/directories failed to add to the zip:", rejectedFiles);
      // Depending on your requirements, you might want to throw an error here
      // or still proceed with a partial zip. For now, we proceed to close.
    } else {
    }

    // Close the zip writer AFTER all files have been attempted to be added
    signalRequest({ type: REQ_SIGNAL.END });

    return new Response(await zipWriter.close(), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${workspace.name}.zip"`,
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      console.error("{EncZip}: Workspace not found error:", e);
      return new Response("Error: Workspace not found", { status: 404 });
    }
    console.error(`{EncZip}: Uncaught error in handleDownloadRequestEncrypted:`, e);
    // Attempt to return a response even if an error occurs to prevent hanging
    return new Response(`Error during download: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}
