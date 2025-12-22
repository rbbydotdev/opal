import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { ROOT_NODE } from "@/components/filetree/TreeNode";
import { useFileContents } from "@/data/useFileContents";
import { CodeMirrorEditor } from "@/editor/CodeMirror";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/hooks/useFileTreeDragDrop";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import "@/source-editor/code-mirror-source-editor.css";
import { SourceMimeType } from "@/source-editor/SourceMimeType";
import { Workspace } from "@/workspace/Workspace";

export const SourceEditor = ({
  currentWorkspace,
  className,
  mimeType = "text/plain",
}: {
  currentWorkspace: Workspace;
  className?: string;
  mimeType?: SourceMimeType;
}) => {
  const { contents, updateDebounce, hasConflicts } = useFileContents({
    currentWorkspace,
  });
  const { storedValue: enableGitConflictResolution } = useLocalStorage(
    "SourceEditor/enableGitConflictResolution",
    true
  );

  if (contents === null) return null;

  return (
    <ConditionalDropzone
      shouldActivate={isExternalFileDrop}
      onDrop={(e) =>
        handleDropFilesEventForNode({
          currentWorkspace: currentWorkspace,
          event: e,
          targetNode: ROOT_NODE,
        })
      }
    >
      <CodeMirrorEditor
        hasConflicts={hasConflicts}
        currentWorkspace={currentWorkspace}
        mimeType={mimeType}
        value={String(contents ?? "")}
        onChange={updateDebounce}
        readOnly={false}
        className={cn("h-full flex-grow", className)}
        enableConflictResolution={enableGitConflictResolution}
      />
    </ConditionalDropzone>
  );
};
