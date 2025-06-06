"use client";
import { WorkspaceView } from "@/components/WorkspaceEditor";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import useFavicon from "@/hooks/useFavicon";

export default function Page() {
  const { id } = useWorkspaceRoute();
  useFavicon("/favicon.svg" + "?" + id, "image/svg+xml");

  //     <FileError error={error} />
  return <WorkspaceView />;
}
