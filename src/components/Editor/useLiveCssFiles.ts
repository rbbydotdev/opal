import { isFilePathsPayload } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { absPath, isMarkdown } from "@/lib/paths2";
import { useEffect, useRef, useState } from "react";

const noCached = (filePath: string): string => {
  return filePath.split("?c=")[0]!;
};
export function useLiveCssFiles({
  path,
  currentWorkspace,
}: {
  path: string | null;
  currentWorkspace: Workspace;
  domElement?: HTMLElement | null;
}) {
  const [cssFiles, setCssFiles] = useState<string[]>([]);
  const cacheBuster = useRef(Date.now());
  const cached = (filePath: string) => {
    return `${filePath}?c=${cacheBuster.current}`;
  };

  useEffect(() => {
    if (!!path && !!currentWorkspace && !currentWorkspace.isNull && isMarkdown(path!)) {
      const css = Object.values(
        currentWorkspace.nodeFromPath(path)?.parent?.filterOutChildren((child) => child.isCssFile()) || {}
      ).map((node) => cached(node.path));

      if (!css.find((href) => href.startsWith("/global.css")) && currentWorkspace.nodeFromPath(absPath("global.css"))) {
        css.push(cached(absPath("global.css")));
      }

      setCssFiles(css);

      return currentWorkspace.dirtyListener((trigger) => {
        if (isFilePathsPayload(trigger)) {
          const updated = new Set(trigger.filePaths.filter((filePath) => filePath.endsWith(".css")));
          if (updated.size === 0) return;
          setCssFiles((prev) => {
            const newCss = [...new Set(prev.map(noCached)).difference(updated)].map(cached);
            cacheBuster.current += Date.now();
            return [...newCss, ...updated.values().map(cached)];
          });
        } else if (trigger !== undefined) {
          if (trigger.type === "create") {
            cacheBuster.current += 1; // Increment cache buster to force reload
            setCssFiles((prev) => [
              ...prev.map(noCached),
              ...trigger.details.filePaths.filter((filePath) => filePath.endsWith(".css")),
            ]);
          }
          if (trigger.type === "delete") {
            setCssFiles((prev) =>
              prev
                .map(noCached)
                .filter((filePath) => !trigger.details.filePaths.includes(filePath))
                .map(cached)
            );
          }
          if (trigger.type === "rename") {
            cacheBuster.current += 1; // Increment cache buster to force reload
            setCssFiles((prev) =>
              prev.map(noCached).map((filePath) => {
                const renamedFile = trigger.details.find(({ oldPath }) => oldPath === filePath);
                return cached(renamedFile ? renamedFile.newPath : filePath);
              })
            );
          }
        }
      });
    }
  }, [currentWorkspace, path]);
  return cssFiles.map((filePath) => filePath);
}
