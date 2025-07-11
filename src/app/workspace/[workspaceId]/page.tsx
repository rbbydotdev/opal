"use client";

import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { CardTiltWindow } from "@/components/ui/CardTilt";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import {
  isExternalFileDrop,
  useHandleDropFilesEventForNode,
  useHandleDropFilesEventForNodeRedirect,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import useFavicon from "@/hooks/useFavicon";
import { RootNode, TreeNode } from "@/lib/FileTree/TreeNode";
import { Opal } from "@/lib/Opal";
import { absPath } from "@/lib/paths2";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { currentWorkspace } = useWorkspaceContext();
  const handleExternalDropEvent = useHandleDropFilesEventForNode({ currentWorkspace });
  const { id } = useWorkspaceRoute();
  useFavicon("/favicon.svg" + "?" + id, "image/svg+xml");
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
        onDrop={(e) => handleExternalDropEvent(e, TreeNode.FromPath(absPath("/"), "dir"))}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Overlay for background opacity */}
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
          <CardTiltWindow className="rounded-xl text-accent-foreground p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center relative z-10">
            <Opal size={78} />
            <div className="font-thin text-2xl font-mono text-center">Opal</div>
          </CardTiltWindow>
        </ConditionalDropzone>
      </div>
    </>
  );
}

function FirstFileRedirect() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceContext();
  useEffect(() => {
    if (!currentWorkspace.isNull) {
      void currentWorkspace.tryFirstFileUrl().then((ff) => router.push(ff));
    }
  }, [currentWorkspace, router]);
  return null;
}
