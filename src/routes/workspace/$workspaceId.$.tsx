import { SpotlightSearch } from "@/components/SpotlightSearch";
import { WorkspaceView } from "@/components/WorkspaceEditor";
import { useCurrentFilepath, useWorkspaceContext } from "@/context/WorkspaceHooks";
import useFavicon from "@/hooks/useFavicon";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/workspace/$workspaceId/$")({
  component: WorkspaceFilePage,
});

function WorkspaceFilePage() {
  const { workspaceId } = Route.useParams();
  const { filePath } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  useFavicon("/favicon.svg" + "?" + workspaceId, "image/svg+xml");

  useEffect(() => {
    if (workspaceId) {
      document.title = workspaceId;
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!currentWorkspace.isNull && filePath && currentWorkspace.nodeFromPath(filePath)?.isTreeDir()) {
      void currentWorkspace.tryFirstFileUrl().then((path) => navigate({ to: path }));
    }
  }, [currentWorkspace, filePath, navigate]);

  if (!filePath) return null;

  return (
    <>
      <SpotlightSearch currentWorkspace={currentWorkspace} />
      <WorkspaceView key={filePath + workspaceId} currentWorkspace={currentWorkspace} />
    </>
  );
}
