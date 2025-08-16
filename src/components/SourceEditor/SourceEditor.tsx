import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import { useFileContents } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { cn } from "@/lib/utils";

export const SourceEditor = ({
  currentWorkspace,
  className,
  mimeType = "text/plain",
}: {
  currentWorkspace: Workspace;
  className?: string;
  mimeType?: string;
}) => {
  const { initialContents, debouncedUpdate, error } = useFileContents({ currentWorkspace });
  if (error) {
    throw error;
  }
  return (
    <div className="h-full">
      <div className="bg-sidebar"></div>
      <CodeMirrorEditor
        mimeType={mimeType as "text/css" | "text/plain" | "text/markdown"}
        value={String(initialContents || "")}
        onChange={debouncedUpdate}
        readOnly={false}
        className={cn("source-editor", "flex-grow", className)}
      />
    </div>
  );
};
