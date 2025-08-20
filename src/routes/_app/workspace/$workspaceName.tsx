import { EditorSidebarLayout } from "@/app/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { useWorkspacePathPreviewURL } from "@/components/ScrollSync";
import { PreviewIFrame } from "@/components/ui/autoform/components/PreviewIframe";
import { Toaster } from "@/components/ui/toaster";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import useFavicon from "@/hooks/useFavicon";
import { prefix } from "@/lib/paths2";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

export const Route = createFileRoute("/_app/workspace/$workspaceName")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceName } = Route.useParams();
  useFavicon("/favicon.svg" + "?" + workspaceName, "image/svg+xml");
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();

  const previewNode = useMemo(() => {
    if (!path) return null;
    const currentNode = currentWorkspace.nodeFromPath(path);
    if (currentNode?.isMarkdownFile()) return currentNode;
    if (currentNode?.isImageFile()) return null;
    return (
      currentNode?.siblings().find((node) => node.isMarkdownFile() && prefix(node.path) === prefix(path)) ||
      currentNode?.siblings().find((node) => node.isMarkdownFile()) ||
      currentNode
    );
  }, [currentWorkspace, path]);

  const previewURL = useWorkspacePathPreviewURL(previewNode?.path);

  useEffect(() => {
    if (workspaceName) {
      document.title = workspaceName;
    }
  }, [workspaceName]);
  return (
    <>
      <Toaster />
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout
          renderHiddenSidebar={true}
          sidebar={<EditorSidebar className="main-editor-sidebar" />}
          main={<Outlet />}
          rightPaneEnabled={Boolean(previewURL) && Boolean(previewNode?.isMarkdownFile())}
          rightPane={previewURL ? <PreviewIFrame previewPath={previewNode?.path} previewURL={previewURL} /> : null}
        />
      </div>
    </>
  );
}
