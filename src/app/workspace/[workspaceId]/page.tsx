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
      className="w-full h-full flex items-center justify-center"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <FirstFileRedirectWithCurrentWorkspace />
      <div className="rounded-xl text-accent-foreground p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center">
        <div>
          <Opal size={78} />
        </div>
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
