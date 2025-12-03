import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { OpalCard } from "@/components/OpalCard";
// import { SpotlightSearch } from "@/components/SpotlightSearch";
import { ROOT_NODE, TreeNode } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import {
  handleDropFilesEventForNode,
  isExternalFileDrop,
  useHandleDropFilesEventForNodeRedirect,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { absPath } from "@/lib/paths2";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workspace/$workspaceName/")({
  component: WorkspaceIndexPage,
});

function WorkspaceIndexPage() {
  const { currentWorkspace } = useWorkspaceContext();

  const handleExternalDrop = useHandleDropFilesEventForNodeRedirect({ currentWorkspace });

  return (
    <>
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
