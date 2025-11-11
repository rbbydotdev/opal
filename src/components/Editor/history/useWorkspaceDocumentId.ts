import { crc32 } from "@/lib/crc32";
import { getMarkdownData } from "@/lib/markdown/frontMatter";
import { nanoid } from "nanoid";

const wonkId = (pathname?: string | null) =>
  pathname
    ? `${[
        ...new Set(
          pathname
            .replace(/[^a-zA-Z0-9]/g, "")
            .split("")
            .sort()
        ),
      ].join("")}_${crc32(pathname)}`
    : nanoid();

export function useWorkspaceDocumentId(contents: string | null, pathname?: string | null) {
  return (
    (getMarkdownData(contents ?? "")?.documentId as string) ?? wonkId(pathname) // Generate a random ID if we can't find one
  );
}
