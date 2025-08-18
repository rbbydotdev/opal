import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { OpalCard } from "@/components/OpalCard";
// import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import {
  handleDropFilesEventForNode,
  isExternalFileDrop,
  useHandleDropFilesEventForNodeRedirect,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { RootNode, TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath } from "@/lib/paths2";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workspace/$workspaceName/")({
  component: WorkspaceIndexPage,
});

function WorkspaceIndexPage() {
  const { currentWorkspace } = useWorkspaceContext();
  // const navigate = useNavigate()

  const handleExternalDrop = useHandleDropFilesEventForNodeRedirect({ currentWorkspace });

  return (
    <>
      {/* <SpotlightSearch currentWorkspace={currentWorkspace} /> */}
      <div
        style={{
          backgroundImage: "url('/opal.svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "600px 600px",
          position: "relative",
        }}
        className="w-full h-full flex items-center justify-center"
        onDrop={(e) =>
          handleDropFilesEventForNode({
            currentWorkspace,
            event: e,
            targetNode: TreeNode.FromPath(absPath("/"), "dir"),
          })
        }
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <ConditionalDropzone shouldActivate={isExternalFileDrop} onDrop={(e) => handleExternalDrop(e, RootNode)}>
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

// function FirstFileRedirect() {
//   const navigate = useNavigate();
//   const { currentWorkspace } = useWorkspaceContext();
//   useEffect(() => {
//     if (!currentWorkspace.isNull) {
//       void currentWorkspace.tryFirstFileUrl().then((ff) => navigate({ to: ff }));
//     }
//   }, [currentWorkspace, navigate]);
//   return null;
// }
