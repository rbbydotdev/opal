import { FileError } from "@/components/filetree/FileError";
import { TrashBanner } from "@/components/TrashBanner";
import { UnrecognizedFileCard } from "@/components/UnrecognizedFileCard";
import { WorkspaceImageView } from "@/components/workspace/WorkspaceImageView";
import { useFileContents } from "@/data/useFileContents";
import { Editor, EditorSelector, getEditor } from "@/editors/EditorSelector";
import { MarkdownEditor } from "@/editors/markdown/MarkdownEditor";
import { useEditorKey } from "@/editors/useEditorKey";
import { useWatchViewMode } from "@/editors/view-mode/useWatchViewMode";
import useFavicon from "@/hooks/useFavicon";
import { NotFoundError } from "@/lib/errors/errors";
import { AbsPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { SourceEditor } from "@/source-editor/SourceEditor";
import { Workspace } from "@/workspace/Workspace";
import { useCurrentFilepath, useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { SourceMimeType } from "../source-editor/SourceMimeType";

export function WorkspaceFilePage() {
  const { workspaceName } = useParams({ strict: false });
  const { filePath, isImage: isImage } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();
  const editorKey = useEditorKey();
  const navigate = useNavigate();
  useEffect(() => {
    if (workspaceName) document.title = workspaceName;
  }, [workspaceName]);
  useFavicon("/favicon.svg" + "?workspaceName=" + workspaceName, "image/svg+xml");

  useEffect(() => {
    if (!currentWorkspace.isNull && filePath && currentWorkspace.nodeFromPath(filePath)?.isTreeDir()) {
      void currentWorkspace.tryFirstFileUrl().then((path) => navigate({ to: path.toString() }));
    }
  }, [currentWorkspace, filePath, navigate]);

  if (!currentWorkspace.isNull && currentWorkspace.nodeFromPath(filePath) === null) {
    return <FileError error={new NotFoundError("File not found: " + filePath)} />;
  }
  if (isImage) {
    return <ImageViewer filePath={filePath} currentWorkspace={currentWorkspace} />;
  }
  return <TextEditor key={editorKey} filePath={filePath} currentWorkspace={currentWorkspace} />;
}

function TextEditor({ currentWorkspace, filePath }: { currentWorkspace: Workspace; filePath: AbsPath | null }) {
  const { inTrash, isSourceView, mimeType, isMarkdown, isRecognized } = useCurrentFilepath();
  const [, setViewMode] = useWatchViewMode();
  const { error, hasConflicts } = useFileContents({
    currentWorkspace,
  });
  if (error) throw error;

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
            setViewMode("rich-text");
          }
        } else {
          setViewMode("source");
        }
      }
    };
    const controller = new AbortController();
    window.addEventListener("keydown", handleCmdE, {
      signal: controller.signal,
    });
    window.addEventListener("keydown", handleCmdSemicolon, {
      signal: controller.signal,
    });
    window.addEventListener("keydown", handleEscEsc, {
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [isMarkdown, isSourceView, hasConflicts, setViewMode]);

  if (!filePath) return null;

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} className={cn({ "top-2": isSourceView || hasConflicts })} />}
      <EditorSelector selected={getEditor({ isRecognized, isMarkdown, isSourceView, hasConflicts, mimeType })}>
        <Editor id="unrecognized">
          <UnrecognizedFileCard fileName={filePath?.split("/").pop() || null} mimeType={mimeType} />
        </Editor>
        <Editor id="source">
          <SourceEditor mimeType={mimeType as SourceMimeType} currentWorkspace={currentWorkspace} />
        </Editor>
        <Editor id="markdown">
          <MarkdownEditor path={filePath} currentWorkspace={currentWorkspace} />
        </Editor>
      </EditorSelector>
    </>
  );
}

function ImageViewer({ filePath, currentWorkspace }: { filePath: string | null; currentWorkspace: Workspace }) {
  return <WorkspaceImageView currentWorkspace={currentWorkspace} key={filePath} />;
}
