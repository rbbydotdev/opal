import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import "@/components/SourceEditor/code-mirror-source-editor.css";
import { Workspace } from "@/Db/Workspace";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { cn } from "@/lib/utils";

export const SourceEditor = ({
  hasConflicts,
  currentWorkspace,
  className,
  mimeType = "text/plain",
  initialContents,
  updateDebounce,
}: {
  hasConflicts: boolean;
  currentWorkspace: Workspace;
  className?: string;
  mimeType?: string;
  initialContents?: string | Uint8Array | null;
  updateDebounce: (newContent: string) => void;
}) => {
  const { storedValue: enableGitConflictResolution } = useLocalStorage2(
    "SourceEditor/enableGitConflictResolution",
    true
  );

  return (
    <div className="h-full">
      {/* <div className="bg-sidebar"></div> */}

      <CodeMirrorEditor
        hasConflicts={hasConflicts}
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
