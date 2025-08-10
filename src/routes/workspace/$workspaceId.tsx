import { createFileRoute, Outlet } from '@tanstack/react-router'
import { EditorSidebar } from "@/components/EditorSidebar";
import { Toaster } from "@/components/ui/toaster";
import { EditorSidebarLayout } from "@/app/(main)/workspace/[workspaceId]/EditorSidebarLayout";
import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { Card } from "@/components/ui/card";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import {
  handleDropFilesEventForNode,
  isExternalFileDrop,
  useHandleDropFilesEventForNodeRedirect,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import useFavicon from "@/hooks/useFavicon";
import { RootNode, TreeNode } from "@/lib/FileTree/TreeNode";
import { Opal } from "@/lib/Opal";
import { absPath } from "@/lib/paths2";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute('/workspace/$workspaceId')({
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  const { workspaceId } = Route.useParams()
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
        <EditorSidebarLayout 
          sidebar={<EditorSidebar className="main-editor-sidebar" />} 
          main={<Outlet />} 
        />
      </div>
    </>
  );
}

