import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { OpalCard } from "@/components/OpalCard";
// import { SpotlightSearch } from "@/components/SpotlightSearch";
import { ROOT_NODE, TreeNode } from "@/components/filetree/TreeNode";
import {
  handleDropFilesEventForNode,
  isExternalFileDrop,
  useHandleDropFilesEventForNodeRedirect,
} from "@/hooks/useFileTreeDragDrop";
import { useThemeContext } from "@/layouts/ThemeContextValue";
import { absPath } from "@/lib/paths2";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workspace/$workspaceName/")({
  component: WorkspaceIndexPage,
});

function WorkspaceIndexPage() {
  const { currentWorkspace } = useWorkspaceContext();

  const handleExternalDrop = useHandleDropFilesEventForNodeRedirect({ currentWorkspace });
  const { theme } = useThemeContext();

  return (
    <>
      <div
        style={{
          backgroundImage: theme === "dark" ? "url('/opal-blank.svg')" : "url('/opal.svg')",
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
              opacity: theme === "dark" ? 0.6 : 0.8,
              pointerEvents: "none",
            }}
          />
          <OpalCard />
        </ConditionalDropzone>
      </div>
    </>
  );
}
