import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { CodeMirrorEditor } from "@/components/Editor/CodeMirror";
import "@/components/SourceEditor/code-mirror-source-editor.css";
import { useFileContents } from "@/context/useFileContents";
import { Workspace } from "@/Db/Workspace";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { OpalMimeType } from "@/lib/fileType";
import { cn } from "@/lib/utils";

export type SourceMimeType = Extract<OpalMimeType, "text/css" | "text/plain" | "text/markdown">;
export const isSourceMimeType = (mimeType: string): mimeType is SourceMimeType =>
  mimeType === "text/css" || mimeType === "text/plain" || mimeType === "text/markdown";

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
          targetNode: RootNode,
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
