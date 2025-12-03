import { NewWorkspaceDialog } from "@/components/new-workspace-modal/NewWorkspaceDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_app/newWorkspace")({
  component: NewWorkspacePage,
});

function NewWorkspacePage() {
  const [isOpen, setIsOpen] = useState(true);
  return <NewWorkspaceDialog isOpen={isOpen} setIsOpen={setIsOpen} />;
}
