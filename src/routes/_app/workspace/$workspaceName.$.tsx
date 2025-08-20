import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { FileError } from "@/components/FileError";
import { SourceEditor } from "@/components/SourceEditor/SourceEditor";
// import { SpotlightSearch } from "@/components/SpotlightSearch";
import { TrashBanner } from "@/components/TrashBanner";
import { WorkspaceMarkdownEditor } from "@/components/WorkspaceContentView";
import { WorkspaceImageView } from "@/components/WorkspaceImageView";
import { useCurrentFilepath, useWorkspaceContext } from "@/context/WorkspaceContext";
import useFavicon from "@/hooks/useFavicon";
import { NotFoundError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/workspace/$workspaceName/$")({
  component: WorkspaceFilePage,
});

function WorkspaceFilePage() {
  const { workspaceName } = Route.useParams();
  const { filePath, isImage, inTrash, isSourceView, mimeType, isMarkdown } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);

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

    const handleCmdSlash = (e: KeyboardEvent) => {
      if (isMarkdown && e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.stopPropagation();
        e.preventDefault();
        if (isSourceView) {
          setViewMode("rich-text", "hash");
        } else {
          setViewMode("source", "hash");
        }
      }
    };
    window.addEventListener("keydown", handleCmdE);
    window.addEventListener("keydown", handleCmdSlash);
    window.addEventListener("keydown", handleEscEsc);
    return () => {
      window.removeEventListener("keydown", handleCmdSlash);
      window.removeEventListener("keydown", handleCmdE);
      window.removeEventListener("keydown", handleEscEsc);
    };
  }, [isMarkdown, isSourceView]);

  useEffect(() => {
    if (!currentWorkspace.isNull && filePath && currentWorkspace.nodeFromPath(filePath)?.isTreeDir()) {
      void currentWorkspace.tryFirstFileUrl().then((path) => navigate({ to: path }));
    }
  }, [currentWorkspace, filePath, navigate]);

  if (!filePath) return null;

  if (!currentWorkspace.isNull && currentWorkspace.nodeFromPath(filePath) === null) {
    return <FileError error={new NotFoundError("File not found: " + filePath)} />;
  }

  return (
    <>
      {/* <SpotlightSearch currentWorkspace={currentWorkspace} /> */}
      <div id="spotlight-slot"></div>
      {inTrash && <TrashBanner filePath={filePath} className={cn({ "top-2": isSourceView })} />}
      {isImage ? (
        <WorkspaceImageView currentWorkspace={currentWorkspace} key={filePath} />
      ) : !isMarkdown || isSourceView ? (
        <SourceEditor mimeType={mimeType} currentWorkspace={currentWorkspace} key={filePath} />
      ) : (
        <WorkspaceMarkdownEditor key={filePath} currentWorkspace={currentWorkspace} />
      )}
    </>
  );
}
