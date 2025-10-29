import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { FileError } from "@/components/FileError";
import { isSourceMimeType, SourceEditor } from "@/components/SourceEditor/SourceEditor";
import { TrashBanner } from "@/components/TrashBanner";
import { UnrecognizedFileCard } from "@/components/UnrecognizedFileCard";
import { WorkspaceMarkdownEditor } from "@/components/WorkspaceContentView";
import { WorkspaceImageView } from "@/components/WorkspaceImageView";
import { useFileContents } from "@/context/useFileContents";
import { useCurrentFilepath, useWorkspaceContext } from "@/context/WorkspaceContext";
import { Workspace } from "@/data/Workspace";
import useFavicon from "@/hooks/useFavicon";
import { NotFoundError } from "@/lib/errors";
import { hasGitConflictMarkers } from "@/lib/gitConflictDetection";
import { AbsPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function WorkspaceFilePage() {
  const { workspaceName } = useParams({ strict: false });
  const { filePath, isImage: isImage } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");

  useEffect(() => {
    if (!currentWorkspace.isNull && filePath && currentWorkspace.nodeFromPath(filePath)?.isTreeDir()) {
      void currentWorkspace.tryFirstFileUrl().then((path) => navigate({ to: path }));
    }
  }, [currentWorkspace, filePath, navigate]);

  if (!filePath) return null;
  if (!currentWorkspace.isNull && currentWorkspace.nodeFromPath(filePath) === null) {
    return <FileError error={new NotFoundError("File not found: " + filePath)} />;
  }
  if (isImage) {
    return <ImageViewer filePath={filePath} currentWorkspace={currentWorkspace} />;
  }
  return <TextEditor filePath={filePath} currentWorkspace={currentWorkspace} />;
}

function TextEditor({ currentWorkspace, filePath }: { currentWorkspace: Workspace; filePath: AbsPath }) {
  // Get file contents to check for conflicts (only for non-image files)

  const { inTrash, isSourceView, mimeType, isMarkdown, isRecognized } = useCurrentFilepath();
  const { contents, updateDebounce, error, hotContents } = useFileContents({
    currentWorkspace,
  });

  if (error) {
    throw error;
  }

  const [hasConflicts, setHasConflicts] = useState(false);

  useEffect(() => {
    setHasConflicts(hasGitConflictMarkers(String(contents)));
  }, [contents]);

  const handleSourceContentChange = (newContent: string) => {
    const hasConflictsNow = hasGitConflictMarkers(newContent);
    if (hasConflicts !== hasConflictsNow) setHasConflicts(hasConflictsNow);
    updateDebounce(newContent);
  };

  useEffect(() => {
    const handleCmdE = (e: KeyboardEvent) => {
      if (e.key === "e" && (e.metaKey || e.ctrlKey)) {
        const editor =
          document.querySelector(".content-editable") ??
          document.querySelector(".code-mirror-source-editor .cm-content");
        (editor as HTMLElement)?.focus();
      }
    };
    const handleEscEsc = (() => {
      let lastEscTime = 0;
      return (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          // Check if focus is inside the editor
          const isEditorFocused =
            document.activeElement?.closest(".content-editable, .code-mirror-source-editor") !== null;

          if (!isEditorFocused) return;

          const now = Date.now();
          if (now - lastEscTime < 500) {
            // 500ms threshold for double Escape
            e.preventDefault();
            // Clear any selection
            window.getSelection()?.removeAllRanges();
            // Remove focus from any active element
            (document.activeElement as HTMLElement)?.blur();
          }
          lastEscTime = now;
        }
      };
    })();

    const handleCmdSemicolon = (e: KeyboardEvent) => {
      if (isMarkdown && e.key === ";" && (e.metaKey || e.ctrlKey)) {
        e.stopPropagation();
        e.preventDefault();
        if (isSourceView) {
          // Don't allow switching to rich text if conflicts exist
          if (!hasConflicts) {
            setViewMode("rich-text", "hash");
          }
        } else {
          setViewMode("source", "hash");
        }
      }
    };
    window.addEventListener("keydown", handleCmdE);
    window.addEventListener("keydown", handleCmdSemicolon);
    window.addEventListener("keydown", handleEscEsc);
    return () => {
      window.removeEventListener("keydown", handleCmdSemicolon);
      window.removeEventListener("keydown", handleCmdE);
      window.removeEventListener("keydown", handleEscEsc);
    };
  }, [isMarkdown, isSourceView, hasConflicts]);

  if (!filePath) return null;

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} className={cn({ "top-2": isSourceView || hasConflicts })} />}
      {!isRecognized ? (
        <UnrecognizedFileCard key={filePath} fileName={filePath?.split("/").pop() || ""} mimeType={mimeType} />
      ) : (!isMarkdown || isSourceView || hasConflicts) && isSourceMimeType(mimeType) ? (
        <SourceEditor
          onChange={handleSourceContentChange}
          hasConflicts={hasConflicts}
          mimeType={mimeType}
          currentWorkspace={currentWorkspace}
          key={filePath}
        />
      ) : (
        <WorkspaceMarkdownEditor contents={hotContents} path={filePath} currentWorkspace={currentWorkspace} />
      )}
    </>
  );
}

function ImageViewer({ filePath, currentWorkspace }: { filePath: string; currentWorkspace: Workspace }) {
  return <WorkspaceImageView currentWorkspace={currentWorkspace} key={filePath} />;
}
