import { WorkspaceFilePage } from "@/editor/WorkspaceFilePage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workspace/$workspaceName/$")({
  component: WorkspaceFilePage /* <WorkspaceFilePage  */,
});
