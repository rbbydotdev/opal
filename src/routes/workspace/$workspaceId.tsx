import { EditorSidebarLayout } from "@/app/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { Toaster } from "@/components/ui/toaster";
import useFavicon from "@/hooks/useFavicon";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/workspace/$workspaceId")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceId } = Route.useParams();
  useFavicon("/favicon.svg" + "?" + workspaceId, "image/svg+xml");

  useEffect(() => {
    if (workspaceId) {
      document.title = workspaceId;
    }
  }, [workspaceId]);

  return (
    <>
      <Toaster />
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout sidebar={<EditorSidebar className="main-editor-sidebar" />} main={<Outlet />} />
      </div>
    </>
  );
}
