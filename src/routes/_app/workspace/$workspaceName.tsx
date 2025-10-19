import { EditorSidebar } from "@/components/EditorSidebar";
import { FileTreeMenuCtxProvider } from "@/components/FileTreeMenuCtxProvider";
import { WorkspaceSpotlightSearch } from "@/components/SpotlightSearch";
import { PreviewIFrame } from "@/components/ui/autoform/components/PreviewIframe";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { FileOnlyFilter, useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { FilterInSpecialDirs } from "@/Db/SpecialDirs";
import { EditorSidebarLayout } from "@/features/preview-pane/EditorSidebarLayout";
import { usePreviewPaneProps } from "@/features/preview-pane/usePreviewPaneProps";
import useFavicon from "@/hooks/useFavicon";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";

export const Route = createFileRoute("/_app/workspace/$workspaceName")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceName } = Route.useParams();
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();

  const { previewURL, previewNode, canShow } = usePreviewPaneProps({ path, currentWorkspace });

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);
  return (
    <>
      <Toaster />
      <FileTreeProvider currentWorkspace={currentWorkspace} filterIn={FileOnlyFilter} filterOut={FilterInSpecialDirs}>
        <FileTreeMenuCtxProvider currentWorkspace={currentWorkspace}>
          <WorkspaceSpotlightSearch />
        </FileTreeMenuCtxProvider>
      </FileTreeProvider>
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout
          // renderHiddenSidebar={true}
          sidebar={<EditorSidebar className="main-editor-sidebar" />}
          main={<Outlet />}
          rightPaneEnabled={canShow}
          rightPane={previewURL ? <PreviewIFrame previewPath={previewNode?.path} previewURL={previewURL} /> : null}
        />
      </div>
    </>
  );
}
