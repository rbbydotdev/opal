import { useBuildModal } from "@/components/BuildModal";
import { FileTreeMenuCtxProvider } from "@/components/FileTreeMenuCtxProvider";
import { BuildSelector } from "@/components/SidebarFileMenu/build-files-section/BuildSelector";
import { BuildSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/build-files-section/BuildSidebarFileMenuFileSection";
import { useBuildManager } from "@/components/SidebarFileMenu/build-files-section/useBuildManager";
import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { Workspace } from "@/data/Workspace";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { Code2, Ellipsis, Github, Hammer } from "lucide-react";
import { useMemo, useState } from "react";

export function SidebarFileMenuBuild({
  currentWorkspace,
  ...props
}: React.ComponentProps<typeof SidebarGroup> & {
  currentWorkspace: Workspace;
}) {
  const [expanded, setExpand] = useSingleItemExpander("build");
  const { info } = useWorkspaceGitRepo({ currentWorkspace });
  const { openNew } = useBuildModal();

  const [selectedBuildIds, setSelectedBuildIds] = useState<string[]>([]);
  const githubConnected = useMemo(() => info.remotes.some((r) => r.url.includes("github.com")), [info]);

  const { builds, build, setBuildId } = useBuildManager({ currentWorkspace });

  const handlePublishToHTML = async () => {
    try {
      await openNew({
        currentWorkspace,
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
            <SidebarSeparator />
            <div className="min-w-0 flex items-center w-full">
              <BuildSelector builds={builds} setBuildId={setBuildId} build={build}>
                <Button className="h-12 w-6 shrink-0 flex-grow" variant="outline">
                  <Ellipsis />
                </Button>
              </BuildSelector>
            </div>
            {/* Builds List */}
            {/* <SidebarBuildsList
              workspaceId={currentWorkspace.id}
              selectedBuildIds={selectedBuildIds}
              onSelectionChange={setSelectedBuildIds}
              onDelete={(buildId) => {
                setSelectedBuildIds((prev) => prev.filter((id) => id !== buildId));
              }}
            /> */}
          </div>
          <div className="px-4 pt-2 py-4 flex flex-col gap-4 pl-3">
            <div className="flex-shrink flex">
              <FileTreeMenuCtxProvider>
                <TreeExpanderProvider id="BuildFiles">
                  <FileTreeProvider>
                    <BuildSidebarFileMenuFileSection build={build} />
                  </FileTreeProvider>
                </TreeExpanderProvider>
              </FileTreeMenuCtxProvider>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
