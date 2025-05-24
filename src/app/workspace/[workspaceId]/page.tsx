"use client";

import { useFileTreeDragAndDrop } from "@/components/FiletreeMenu";
import { useWorkspaceContext } from "@/context";
import { Opal } from "@/lib/Opal";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { currentWorkspace } = useWorkspaceContext();
  const { handleDrop } = useFileTreeDragAndDrop({
    currentWorkspace,
  });
  return (
    <div
      style={{
        backgroundImage: "url('/opal.svg')",
        backgroundRepeat: "repeat",
        backgroundSize: "600px 600px",
        // Add a white overlay with opacity to fade the SVG background
        position: "relative",
      }}
      className="w-full h-full flex items-center justify-center"
      onDrop={handleDrop}
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
      <FirstFileRedirectWithCurrentWorkspace />
      <div className="rounded-xl text-accent-foreground p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center bg-white relative z-10">
        <Opal size={78} />
        <div className="font-thin text-2xl font-mono text-center">Opal</div>
      </div>
    </div>
  );
}

function FirstFileRedirect() {
  // function FirstFileRedirect({ currentWorkspace }: { currentWorkspace: Workspace; fileTreeDir: TreeDir }) {
  const router = useRouter();

  const { currentWorkspace } = useWorkspaceContext();
  useEffect(() => {
    if (currentWorkspace) void currentWorkspace.tryFirstFileUrl().then((ff) => router.push(ff));
  }, [currentWorkspace, router]);
  return null;
}

// const FirstFileRedirectWithCurrentWorkspace = withCurrentWorkspace(FirstFileRedirect);
const FirstFileRedirectWithCurrentWorkspace = FirstFileRedirect;
