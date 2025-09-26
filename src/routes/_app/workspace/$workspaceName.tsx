import { EditorSidebarLayout } from "@/app/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { FileTreeMenuCtxProvider } from "@/components/FileTreeMenuCtxProvider";
import { useWorkspacePathPreviewURL } from "@/components/ScrollSync";
import { WorkspaceSpotlightSearch } from "@/components/SpotlightSearch";
import { PreviewIFrame } from "@/components/ui/autoform/components/PreviewIframe";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { FileOnlyFilter, useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import useFavicon from "@/hooks/useFavicon";
import { useResolvePathForPreview } from "@/lib/useResolvePathForPreview";
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

  const previewNode = useResolvePathForPreview({ path, currentWorkspace });

  const previewURL = useWorkspacePathPreviewURL(previewNode?.path);

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);
  return (
    <>
      <Toaster />
      <FileTreeProvider currentWorkspace={currentWorkspace} filterIn={FileOnlyFilter}>
        <FileTreeMenuCtxProvider currentWorkspace={currentWorkspace}>
          <WorkspaceSpotlightSearch />
        </FileTreeMenuCtxProvider>
      </FileTreeProvider>
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout
          renderHiddenSidebar={true}
          sidebar={<EditorSidebar className="main-editor-sidebar" />}
          main={<Outlet />}
          rightPaneEnabled={!!previewURL && (!!previewNode?.isMarkdownFile() || !!previewNode?.isEjsFile() || !!previewNode?.isHtmlFile())}
          rightPane={previewURL ? <PreviewIFrame previewPath={previewNode?.path} previewURL={previewURL} /> : null}
        />
      </div>
    </>
  );
}
