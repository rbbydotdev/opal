import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import "@/components/SourceEditor/code-mirror-source-editor.css";
import { SourceMimeType } from "@/components/SourceEditor/SourceMimeType";
import { useFileContents } from "@/context/useFileContents";
import { Workspace } from "@/data/Workspace";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { ROOT_NODE } from "@/lib/FileTree/TreeNode";
import { cn } from "@/lib/utils";

export const SourceEditor = ({
  hasConflicts,
  currentWorkspace,
  className,
  mimeType = "text/plain",
  onChange,
}: {
  hasConflicts: boolean;
  currentWorkspace: Workspace;
  className?: string;
  mimeType?: SourceMimeType;
  onChange: (newContent: string) => void;
}) => {
  const { storedValue: enableGitConflictResolution } = useLocalStorage2(
    "SourceEditor/enableGitConflictResolution",
    true
  );
  const { contents } = useFileContents({
    currentWorkspace,
  });

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
        value={String(contents)}
        onChange={onChange}
        readOnly={false}
        className={cn("h-full flex-grow", className)}
        enableConflictResolution={enableGitConflictResolution}
      />
    </ConditionalDropzone>
  );
};
