import { useBuildModal } from "@/components/BuildModal";
import { SidebarBuildsList, SidebarBuildsListRef } from "@/components/SidebarFileMenu/build-section/SidebarBuildsList";
import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { Workspace } from "@/Db/Workspace";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { Code2, Github, Hammer } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export function SidebarFileMenuBuild({
  currentWorkspace,
  ...props
}: React.ComponentProps<typeof SidebarGroup> & {
  currentWorkspace: Workspace;
}) {
  const [expanded, setExpand] = useSingleItemExpander("publish");
  const { info } = useWorkspaceGitRepo({ currentWorkspace });
  const { open: openBuildModal } = useBuildModal();
  const [selectedBuildIds, setSelectedBuildIds] = useState<string[]>([]);
  const buildsListRef = useRef<SidebarBuildsListRef>(null);
  const githubConnected = useMemo(() => info.remotes.some((r) => r.url.includes("github.com")), [info]);

  const handlePublishToHTML = async () => {
    try {
      const sourceDisk = currentWorkspace.getDisk();
      // throw new Error("SET BUILD DISK!!!!!!!!!!!!!!!!!!!!!");
      const _result = await openBuildModal({
        sourceDisk,
        outputDisk: sourceDisk, // Use same disk for now // TODO: BUILD DISK >>>>>>>>>>>>>>>>>>>>>>>>>>
        onComplete: async (buildDao) => {
          console.log("Build completed successfully:", buildDao?.guid);
          // Refresh the builds list to show the new build
          await buildsListRef.current?.refresh();
        },
        onCancel: () => {
          console.log("Build cancelled");
        },
      });
    } catch (error) {
      console.error("Build modal error:", error);
    }
  };
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <SidebarGripChevron />
              <div className="w-full">
                <div className="flex justify-center items-center">
                  <Hammer size={12} className="mr-2" />
                  Build
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-4">
            <SidebarGroup className="gap-2 flex flex-col">
              <SidebarGroupLabel>Workspace Actions</SidebarGroupLabel>
              <Button className="w-full flex text-xs" size="sm" variant="outline" onClick={handlePublishToHTML}>
                <Code2 className="mr-1" />
                <span className="flex-grow">Build to HTML</span>
              </Button>
              {githubConnected && (
                <Button className="w-full text-xs" size="sm" variant="outline">
                  <Github className="mr-1" />
                  <span className="flex-grow">Push to Github Pages</span>
                </Button>
              )}
            </SidebarGroup>

            {/* Builds List */}
            <SidebarBuildsList
              ref={buildsListRef}
              diskId={currentWorkspace.getDisk().guid}
              selectedBuildIds={selectedBuildIds}
              onSelectionChange={setSelectedBuildIds}
              onDelete={(buildId) => {
                setSelectedBuildIds((prev) => prev.filter((id) => id !== buildId));
              }}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
