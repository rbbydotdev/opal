import { EditorSidebarLayout } from "@/app/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { Toaster } from "@/components/ui/toaster";
import useFavicon from "@/hooks/useFavicon";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/workspace/$workspaceName")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceName } = Route.useParams();
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);

  return (
    <>
      <Toaster />
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout sidebar={<EditorSidebar className="main-editor-sidebar" />} main={<Outlet />} />
      </div>
    </>
  );
}
