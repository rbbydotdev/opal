import { SpotlightSearch } from "@/components/SpotlightSearch";
import { WorkspaceView } from "@/components/WorkspaceEditor";
import { useCurrentFilepath, useWorkspaceContext } from "@/context/WorkspaceHooks";
import useFavicon from "@/hooks/useFavicon";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/workspace/$workspaceName/$")({
  component: WorkspaceFilePage,
});

function WorkspaceFilePage() {
  const { workspaceName } = Route.useParams();
  const { filePath } = useCurrentFilepath();
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

  return (
    <>
      <SpotlightSearch currentWorkspace={currentWorkspace} />
      <WorkspaceView key={filePath + workspaceName} currentWorkspace={currentWorkspace} />
    </>
  );
}
