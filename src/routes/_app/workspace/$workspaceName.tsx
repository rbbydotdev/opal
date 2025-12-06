import { EditorSidebar } from "@/components/EditorSidebar";
import { FileTreeProvider } from "@/components/filetree/FileTreeContext";
import { FileTreeMenuCtxProvider } from "@/components/filetree/FileTreeMenuContext";
import { FilterInSpecialDirs } from "@/data/SpecialDirs";
import { EditorSidebarLayout } from "@/features/live-preview/EditorSidebarLayout";
import { PreviewIFrame } from "@/features/live-preview/PreviewIframe";
import { usePreviewPaneProps } from "@/features/live-preview/usePreviewPaneProps";
import { ScrollSyncProvider } from "@/features/live-preview/useScrollSync";
import { WorkspaceSpotlightSearch } from "@/features/spotlight/SpotlightSearch";
import useFavicon from "@/hooks/useFavicon";
import { FileOnlyFilter, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/workspace/$workspaceName")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceName } = Route.useParams();
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();

  const { previewURL, previewNode, canShow, setPreviewNode } = usePreviewPaneProps({ path, currentWorkspace });

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);
  const [key, setKey] = useState(0);
  const previewKey = previewNode?.path + "-" + key;
  return (
    <>
      <FileTreeProvider filterIn={FileOnlyFilter} filterOut={FilterInSpecialDirs}>
        <FileTreeMenuCtxProvider>
          <WorkspaceSpotlightSearch />
        </FileTreeMenuCtxProvider>
      </FileTreeProvider>
      <div className="min-w-0 h-full flex w-full">
        <ScrollSyncProvider>
          <EditorSidebarLayout
            sidebar={<EditorSidebar className="main-editor-sidebar" />}
            main={<Outlet />}
            rightPaneEnabled={canShow}
            rightPane={
              previewURL && previewNode?.path ? (
                <PreviewIFrame
                  key={previewKey}
                  refresh={() => setKey((k) => k + 1)}
                  previewPath={previewNode.path}
                  currentWorkspace={currentWorkspace}
                  setPreviewNode={setPreviewNode}
                />
              ) : null
            }
          />
        </ScrollSyncProvider>
      </div>
    </>
  );
}
