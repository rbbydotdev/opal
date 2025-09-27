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
  contents,
  onChange,
}: {
  hasConflicts: boolean;
  currentWorkspace: Workspace;
  className?: string;
  mimeType?: string;
  contents: string | Uint8Array | null;
  onChange: (newContent: string) => void;
}) => {
  const { storedValue: enableGitConflictResolution } = useLocalStorage2(
    "SourceEditor/enableGitConflictResolution",
    true
  );

  return (
    <div className="h-full">
      <CodeMirrorEditor
        hasConflicts={hasConflicts}
        currentWorkspace={currentWorkspace}
        mimeType={mimeType as "text/css" | "text/plain" | "text/markdown"}
        value={String(contents ?? "")}
        onChange={onChange}
        readOnly={false}
        className={cn("code-mirror-source-editor", "flex-grow", className)}
        enableConflictResolution={enableGitConflictResolution}
      />
    </div>
  );
};
