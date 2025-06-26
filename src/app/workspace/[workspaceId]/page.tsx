"use client";

import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { useExternalDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import useFavicon from "@/hooks/useFavicon";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { Opal } from "@/lib/Opal";
import { absPath } from "@/lib/paths2";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { currentWorkspace } = useWorkspaceContext();
  // hold on
  const { externalDrop } = useExternalDrop({ currentWorkspace });
  const { id } = useWorkspaceRoute();
  useFavicon("/favicon.svg" + "?" + id, "image/svg+xml");

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
        onDrop={(e) => externalDrop(e, TreeNode.FromPath(absPath("/"), "dir"))}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Overlay for background opacity */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "white",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />
        <FirstFileRedirect />
        <div className="rounded-xl text-accent-foreground p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center bg-white relative z-10">
          <Opal size={78} />
          <div className="font-thin text-2xl font-mono text-center">Opal</div>
        </div>
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
