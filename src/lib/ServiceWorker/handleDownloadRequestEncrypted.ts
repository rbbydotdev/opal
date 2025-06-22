import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { isError, NotFoundError } from "@/lib/errors";
import { EncHeader, PassHeader } from "@/lib/ServiceWorker/downloadEncryptedZipHelper";
import { REQ_SIGNAL } from "@/lib/ServiceWorker/request-signal-types";
import { signalRequest } from "@/lib/ServiceWorker/sw";
import { BlobWriter, Uint8ArrayReader, ZipWriter, ZipWriterConstructorOptions } from "@zip.js/zip.js";
import { SWWStore } from "./SWWStore";

// function formatConsoleMsg(msg: unknown): string {
//   if (msg instanceof Error) {
//     return `${msg.name}: ${msg.message}\n${msg.stack ?? ""}`;
//   }
//   if (typeof msg === "object") {
//     try {
//       return JSON.stringify(msg, null, 2);
//     } catch {
//       return String(msg);
//     }
//   }
//   return String(msg);
// }

// const RL = RemoteLogger("ServiceWorker");
// console.log = function (msg: unknown) {
//   RL(formatConsoleMsg(msg), "log");
// };
// console.debug = function (msg: unknown) {
//   RL(formatConsoleMsg(msg), "debug");
// };
// console.error = function (msg: unknown) {
//   RL(formatConsoleMsg(msg), "error");
// };
// console.warn = function (msg: unknown) {
//   RL(formatConsoleMsg(msg), "warn");
// };

export interface DownloadOptions {
  password: string;
  encryption: "aes" | "zipcrypto";
}
export async function handleDownloadRequestEncrypted(workspaceId: string, event: FetchEvent): Promise<Response> {
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

    const workspace = await SWWStore.tryWorkspace(workspaceId);

    // zip.js ZipWriter takes a WritableStreamDefaultWriter or a WritableStream
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"), zipWriterOptions);

    await workspace.disk.fileTree.index();
    const fileNodes = [...workspace.disk.fileTree.iterator((node) => !node.path.startsWith("/.trash"))];

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
          const data = await workspace.disk.readFile(node.path);
          await zipWriter.add(
            node.path,
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
        const dirName = node.path.endsWith("/") ? node.path : node.path + "/";
        try {
          // Add a 0-byte entry with a trailing slash to represent an empty directory
          await zipWriter.add(dirName, new Uint8ArrayReader(new Uint8Array(0)));

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
