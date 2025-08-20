import { isFilePathsPayload } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { isMarkdown } from "@/lib/paths2";
import { useEffect, useRef, useState } from "react";

export function useLiveCssFiles({ path, currentWorkspace }: { path: string | null; currentWorkspace: Workspace }) {
  const [cssFiles, setCssFiles] = useState<string[]>([]);
  const cacheBuster = useRef(0);

  useEffect(() => {
    if (path && currentWorkspace && !currentWorkspace.isNull && isMarkdown(path)) {
      setCssFiles(
        Object.values(
          currentWorkspace.nodeFromPath(path)?.parent?.filterOutChildren((child) => child.isCssFile()) || {}
        ).map((node) => node.path)
      );
      return currentWorkspace.dirtyListener((trigger) => {
        if (isFilePathsPayload(trigger)) {
          cacheBuster.current += 1; // Increment cache buster to force reload
          setCssFiles(trigger.filePaths.filter((filePath) => filePath.endsWith(".css")));
        } else if (trigger !== undefined) {
          if (trigger.type === "create") {
            cacheBuster.current += 1; // Increment cache buster to force reload
            setCssFiles((prev) => [
              ...prev,
              ...trigger.details.filePaths.filter((filePath) => filePath.endsWith(".css")),
            ]);
          }
          if (trigger.type === "delete") {
            setCssFiles((prev) => prev.filter((filePath) => !trigger.details.filePaths.includes(filePath)));
          }
          if (trigger.type === "rename") {
            cacheBuster.current += 1; // Increment cache buster to force reload
            setCssFiles((prev) =>
              prev.map((filePath) => {
                const renamedFile = trigger.details.find(({ oldPath }) => oldPath === filePath);
                return renamedFile ? renamedFile.newPath : filePath;
              })
            );
          }
        }
      });
    }
  }, [currentWorkspace, path]);
  return cssFiles.map((filePath) => filePath + `?c=${cacheBuster.current}`);
}
