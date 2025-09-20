import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import "@/components/SourceEditor/code-mirror-source-editor.css";
import { useFileContents } from "@/context/useFileContents";
import { Workspace } from "@/Db/Workspace";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
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
  const { contents: initialContents, updateDebounce, error } = useFileContents({ currentWorkspace });
  const { storedValue: enableGitConflictResolution } = useLocalStorage2("SourceEditor/enableGitConflictResolution", true);
  
  if (error) {
    throw error;
  }
  
  return (
    <div className="h-full">
      <div className="bg-sidebar"></div>

      <CodeMirrorEditor
        currentWorkspace={currentWorkspace}
        mimeType={mimeType as "text/css" | "text/plain" | "text/markdown"}
        value={String(initialContents ?? "")}
        onChange={updateDebounce}
        readOnly={false}
        className={cn("code-mirror-source-editor", "flex-grow", className)}
        enableConflictResolution={enableGitConflictResolution}
      />
    </div>
  );
};
