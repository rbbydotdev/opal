import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import "@/components/SourceEditor/code-mirror-source-editor.css";
import { useFileContents } from "@/context/useFileContents";
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
  const { initialContents, updateDebounce: onUpdate, error } = useFileContents({ currentWorkspace });
  if (error) {
    throw error;
  }
  return (
    <div className="h-full">
      <div className="bg-sidebar"></div>
      <CodeMirrorEditor
        currentWorkspace={currentWorkspace}
        mimeType={mimeType as "text/css" | "text/plain" | "text/markdown"}
        value={String(initialContents || "")}
        onChange={onUpdate}
        readOnly={false}
        className={cn("code-mirror-source-editor", "flex-grow", className)}
      />
    </div>
  );
};
