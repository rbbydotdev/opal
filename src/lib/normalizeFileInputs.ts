import mime from "mime-types";
// Assuming you have a mime library installed, e.g., 'npm install mime'
// The popular 'mime' package uses `mime.getExtension()`, while 'mime-types' uses `mime.extension()`.
// We will use your specified `mime.extension()` syntax.

/**
 * A helper function to check if a MIME type matches a filter list
 * that can include wildcards (e.g., 'image/*').
 */
function matchesMimeFilter(mimeType: string, filter: string[]): boolean {
  for (const pattern of filter) {
    if (pattern.endsWith("/*")) {
      const baseType = pattern.slice(0, -1);
      if (mimeType.startsWith(baseType)) {
        return true;
      }
    } else if (pattern === mimeType) {
      return true;
    }
  }
  return false;
}

const DEFAULT_ACCEPTED_TYPES = ["image/*", "text/markdown"];

/**
 * Takes a FileList or ClipboardItems and returns a Promise that resolves
 * to a uniform File[], filtered by accepted MIME types.
 *
 * @param input The raw file input from the browser event.
 * @param acceptedMimeTypes Optional. An array of MIME type strings to accept.
 *   Supports wildcards like 'image/*'. Defaults to images and markdown.
 * @returns A Promise resolving to an array of filtered File objects.
 */
export async function normalizeFileInput(
  input: FileList | ClipboardItems,
  acceptedMimeTypes?: string[]
): Promise<File[]> {
  const filter = acceptedMimeTypes || DEFAULT_ACCEPTED_TYPES;

  if (!Array.isArray(input)) {
    return Array.from(input).filter((file) => matchesMimeFilter(file.type, filter));
  }

  const filePromises = input.map(async (item) => {
    const supportedType = item.types.find((type) => matchesMimeFilter(type, filter));

    if (!supportedType) {
      return null;
    }

    // --- CHANGE HIGHLIGHTED HERE ---
    // Use the mime library to resolve the extension.
    const extension = mime.extension(supportedType);

    // If the library cannot find a suitable extension, ignore the file.
    if (!extension) {
      return null;
    }
    // --- END OF CHANGE ---

    const blob = await item.getType(supportedType);
    const fileName = `pasted-item-${Date.now()}.${extension}`;
    return new File([blob], fileName, { type: supportedType });
  });

  const settledFiles = await Promise.all(filePromises);
  return settledFiles.filter((file): file is File => file !== null);
}
