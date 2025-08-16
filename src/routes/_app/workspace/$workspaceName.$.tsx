import { SpotlightSearch } from "@/components/SpotlightSearch";
import { TrashBanner } from "@/components/TrashBanner";
import { WorkspaceContentView } from "@/components/WorkspaceContentView";
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
  const { filePath, isImage, inTrash, isSourceView } = useCurrentFilepath();
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
      //Maybe a grid view of files? <DirectoryView /> ?
      void currentWorkspace.tryFirstFileUrl().then((path) => navigate({ to: path }));
    }
  }, [currentWorkspace, filePath, navigate]);

  if (!filePath) return null;

  if (!currentWorkspace.isNull && currentWorkspace.nodeFromPath(filePath) === null) {
    throw new NotFoundError("File not found: " + filePath);
  }

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} className={cn({ "top-2": isSourceView })} />}
      <SpotlightSearch currentWorkspace={currentWorkspace} />
      {isImage ? (
        <WorkspaceImageView currentWorkspace={currentWorkspace} />
      ) : (
        <WorkspaceContentView key={filePath + workspaceName} currentWorkspace={currentWorkspace} />
      )}
    </>
  );
}
