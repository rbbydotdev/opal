import { CodeMirrorEditor } from "@/app/editor/CodeMirror";
import { SourceMimeType } from "@/app/source-editor/SourceMimeType";
import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { ROOT_NODE } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import "@/components/source-editor/code-mirror-source-editor.css";
import { useFileContents } from "@/context/useFileContents";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/hooks/useFileTreeDragDrop";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
import { useLocation } from "@tanstack/react-router";

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

  const locationHash = useLocation().hash;

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
        key={locationHash}
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
