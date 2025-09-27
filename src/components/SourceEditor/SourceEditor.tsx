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
  onChange,
}: {
  hasConflicts: boolean;
  currentWorkspace: Workspace;
  className?: string;
  mimeType?: string;
  initialContents?: string | null;
  onChange: (newContent: string) => void;
}) => {
  const { storedValue: enableGitConflictResolution } = useLocalStorage2(
    "SourceEditor/enableGitConflictResolution",
    true
  );
  if (!initialContents) return null;
  return (
    <div className="h-full">
      <CodeMirrorEditor
        hasConflicts={hasConflicts}
        currentWorkspace={currentWorkspace}
        mimeType={mimeType as "text/css" | "text/plain" | "text/markdown"}
        value={String(initialContents)}
        onChange={onChange}
        readOnly={false}
        className={cn("code-mirror-source-editor", "flex-grow", className)}
        enableConflictResolution={enableGitConflictResolution}
      />
    </div>
  );
};
