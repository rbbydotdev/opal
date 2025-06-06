"use client";
import { WorkspaceLiveEditor } from "@/components/WorkspaceLiveEditor";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import useFavicon from "@/hooks/useFavicon";

export default function Page() {
  const { id } = useWorkspaceRoute();
  useFavicon("/favicon.svg" + "?" + id, "image/svg+xml");
  return (
    <>
      <WorkspaceLiveEditor />;
    </>
  );
}
