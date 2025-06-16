"use client";
import { WorkspaceView } from "@/components/WorkspaceEditor";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import useFavicon from "@/hooks/useFavicon";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { id } = useWorkspaceRoute();
  const { filePath } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();
  const router = useRouter();
  useFavicon("/favicon.svg" + "?" + id, "image/svg+xml");

  useEffect(() => {
    if (!currentWorkspace.isNull && filePath && currentWorkspace.nodeFromPath(filePath)?.isTreeDir()) {
      void currentWorkspace.tryFirstFileUrl().then((path) => router.push(path));
    }
  }, [currentWorkspace, filePath, router]);
  return <WorkspaceView />;
}
