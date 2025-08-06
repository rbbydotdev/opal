"use client";
import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { cn } from "@/lib/utils";

export const SourceEditor = ({ className }: { className?: string }) => {
  const { currentWorkspace } = useWorkspaceContext();
  const { mimeType } = useCurrentFilepath();
  const { initialContents, debouncedUpdate } = useFileContents({ currentWorkspace });
  return (
    <CodeMirrorEditor
      mimeType={mimeType as "text/css" | "text/plain" | "text/markdown"}
      value={String(initialContents || "")}
      onChange={debouncedUpdate}
      readOnly={false}
      className={cn("source-editor", "flex-grow", className)}
    />
  );
};
