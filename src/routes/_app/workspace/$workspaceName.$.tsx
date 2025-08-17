import { FileError } from "@/components/FileError";
import { SourceEditor } from "@/components/SourceEditor/SourceEditor";
// import { SpotlightSearch } from "@/components/SpotlightSearch";
import { TrashBanner } from "@/components/TrashBanner";
import { WorkspaceMarkdownEditor } from "@/components/WorkspaceContentView";
import { WorkspaceImageView } from "@/components/WorkspaceImageView";
import { useCurrentFilepath, useWorkspaceContext } from "@/context/WorkspaceHooks";
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
  const { filePath, isImage, inTrash, isSourceView, viewMode, mimeType, isMarkdown } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);

  useEffect(() => {
    if (!currentWorkspace.isNull && filePath && currentWorkspace.nodeFromPath(filePath)?.isTreeDir()) {
      void currentWorkspace.tryFirstFileUrl().then((path) => navigate({ to: path }));
    }
  }, [currentWorkspace, filePath, navigate]);

  if (!filePath) return null;

  if (!currentWorkspace.isNull && currentWorkspace.nodeFromPath(filePath) === null) {
    //todo: universal catch up the tree somewherE?
    return <FileError error={new NotFoundError("File not found: " + filePath)} />;
  }

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} className={cn({ "top-2": isSourceView })} />}
      {/* <SpotlightSearch currentWorkspace={currentWorkspace} /> */}
      {isImage ? (
        <WorkspaceImageView currentWorkspace={currentWorkspace} key={filePath} />
      ) : isMarkdown && viewMode === "source" ? (
        <SourceEditor mimeType={mimeType} currentWorkspace={currentWorkspace} key={filePath} />
      ) : (
        <WorkspaceMarkdownEditor key={filePath} currentWorkspace={currentWorkspace} />
      )}
    </>
  );
}
