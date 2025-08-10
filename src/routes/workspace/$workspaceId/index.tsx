import { createFileRoute } from '@tanstack/react-router'
import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { Card } from "@/components/ui/card";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import {
  handleDropFilesEventForNode,
  isExternalFileDrop,
  useHandleDropFilesEventForNodeRedirect,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { RootNode, TreeNode } from "@/lib/FileTree/TreeNode";
import { Opal } from "@/lib/Opal";
import { absPath } from "@/lib/paths2";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute('/workspace/$workspaceId/')({
  component: WorkspaceIndexPage,
})

function WorkspaceIndexPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const navigate = useNavigate()
  
  const handleExternalDrop = useHandleDropFilesEventForNodeRedirect({ currentWorkspace });

  return (
    <>
      <SpotlightSearch currentWorkspace={currentWorkspace} />
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
          <FirstFileRedirect />
          <Card className="rounded-xl p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center relative z-10">
            <div className="rotate-12">
              <Opal size={78} />
            </div>
            <div className="font-thin text-2xl font-mono text-center">Opal</div>
          </Card>
        </ConditionalDropzone>
      </div>
    </>
  );
}

function FirstFileRedirect() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspaceContext();
  useEffect(() => {
    if (!currentWorkspace.isNull) {
      // void currentWorkspace.tryFirstFileUrl().then((ff) => navigate({ to: ff }));
    }
  }, [currentWorkspace, navigate]);
  return null;
}