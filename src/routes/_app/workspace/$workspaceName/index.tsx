import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { OpalCard } from "@/components/OpalCard";
// import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import {
  handleDropFilesEventForNode,
  isExternalFileDrop,
  useHandleDropFilesEventForNodeRedirect,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { ROOT_NODE, TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath } from "@/lib/paths2";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/workspace/$workspaceName/")({
  component: WorkspaceIndexPage,
});

function WorkspaceIndexPage() {
  const { currentWorkspace } = useWorkspaceContext();

  const handleExternalDrop = useHandleDropFilesEventForNodeRedirect({ currentWorkspace });

  return (
    <>
      <FirstFileRedirect disabled />
      <div
        style={{
          backgroundImage: "url('/opal.svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "600px 600px",
          position: "relative",
        }}
        className="w-full h-full flex items-center justify-center"
        onDrop={(event) =>
          handleDropFilesEventForNode({
            currentWorkspace,
            event,
            targetNode: TreeNode.FromPath(absPath("/"), "dir"),
          })
        }
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <ConditionalDropzone shouldActivate={isExternalFileDrop} onDrop={(e) => handleExternalDrop(e, ROOT_NODE)}>
          <div
            className="bg-background"
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.9,
              pointerEvents: "none",
            }}
          />
          <OpalCard />
        </ConditionalDropzone>
      </div>
    </>
  );
}

function FirstFileRedirect({ disabled }: { disabled?: boolean }) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceContext();
  useEffect(() => {
    if (!currentWorkspace.isNull && !disabled) {
      void currentWorkspace.tryFirstFileUrl().then((ff) => navigate({ to: ff }));
    }
  }, [currentWorkspace, disabled, navigate]);
  return null;
}
