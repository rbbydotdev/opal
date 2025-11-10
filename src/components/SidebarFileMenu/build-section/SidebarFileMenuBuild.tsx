import { useBuildModal } from "@/components/BuildModal";
import { useConfirm } from "@/components/Confirm";
import { FileTreeMenuCtxProvider } from "@/components/FileTreeMenuCtxProvider";
import { BuildSelector } from "@/components/SidebarFileMenu/build-files-section/BuildSelector";
import { BuildSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/build-files-section/BuildSidebarFileMenuFileSection";
import { useBuildManager } from "@/components/SidebarFileMenu/build-files-section/useBuildManager";
import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { SelectHighlight } from "@/components/SidebarFileMenu/sync-section/SelectHighlight";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton, SidebarSeparator } from "@/components/ui/sidebar";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { Workspace } from "@/data/Workspace";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { Code2, Delete, Download, Ellipsis, Github, Hammer, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { timeAgo } from "short-time-ago";

const BuildItem = ({ build }: { build: { guid: string; label: string; timestamp: Date; Disk: { guid: string } } }) => (
  <div className="h-full w-full flex justify-start flex-col items-start gap-1 truncate">
    <div className="w-full flex justify-start items-center">{build.label}</div>
    <div className="text-2xs text-muted-foreground truncate w-full flex justify-start items-center">
      {build.Disk.guid} • {timeAgo(build.timestamp)}
    </div>
  </div>
);

export function SidebarFileMenuBuild({
  currentWorkspace,
  ...props
}: React.ComponentProps<typeof SidebarGroup> & {
  currentWorkspace: Workspace;
}) {
  const [expanded, setExpand] = useSingleItemExpander("build");
  const { info } = useWorkspaceGitRepo({ currentWorkspace });
  const { openNew } = useBuildModal();
  const { open: openConfirm } = useConfirm();

  // const [selectedBuildIds, setSelectedBuildIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const [open, setOpen] = useState(false);
  const githubConnected = useMemo(() => info.remotes.some((r) => r.url.includes("github.com")), [info]);

  const { builds, build, setBuildId } = useBuildManager({ currentWorkspace });

  const handleBuildToHTML = async () => {
    try {
      await openNew({
        currentWorkspace,
      });
    } catch (error) {
      console.error("Build modal error:", error);
    }
  };
  const handlePublishModal = async () => {};

  const handleDeleteBuild = async (buildGuid: string) => {
    try {
      const buildToDelete = builds.find((b) => b.guid === buildGuid);
      if (buildToDelete) {
        await openConfirm(
          async () => {
            await buildToDelete.delete();
          },
          "Delete Build",
          `Are you sure you want to delete this build? This action cannot be undone.`
        );
        // If we deleted the currently selected build, reset selection
        if (build?.guid === buildGuid) {
          setBuildId(builds.filter((b) => b.guid !== buildGuid)[0]?.guid || null);
        }
      }
      setSelectMode("select");
    } catch (error) {
      console.error("Delete build error:", error);
      setSelectMode("select");
    }
  };
  return (
    <>
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

          <CollapsibleContent className="pb-4">
            <div className="px-4 pt-2 pb-2 flex flex-col gap-4">
              <SidebarGroup className="gap-2 flex flex-col">
                <SidebarGroupLabel>Workspace Actions</SidebarGroupLabel>
                {githubConnected && (
                  <Button className="w-full text-xs" size="sm" variant="outline">
                    <Github className="mr-1" />
                    <span className="flex-grow">Push to Github Pages</span>
                  </Button>
                )}
                <Button className="w-full flex text-xs" size="sm" variant="outline" onClick={handleBuildToHTML}>
                  <Code2 className="mr-1" />
                  <span className="flex-grow">Build to HTML</span>
                </Button>
              </SidebarGroup>
              <SidebarSeparator />
              <div className="min-w-0 flex items-center w-full">
                {selectMode === "delete" ? (
                  <SelectHighlight
                    placeholder="Select Build to Delete"
                    className="h-12"
                    itemClassName="focus:bg-destructive focus:text-primary-foreground"
                    items={builds.map((build) => ({
                      value: build.guid,
                      label: <BuildItem build={build} />,
                    }))}
                    onCancel={() => setSelectMode("select")}
                    onSelect={(buildGuid: string) => handleDeleteBuild(buildGuid)}
                  />
                ) : (
                  <>
                    <BuildSelector builds={builds} setBuildId={setBuildId} build={build}>
                      <BuildMenuDropDown open={open} setOpen={setOpen}>
                        <DropdownMenuItem onClick={() => setSelectMode("delete")} disabled={builds.length === 0}>
                          <Delete className="text-destructive" /> Delete Build
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {}} disabled={builds.length === 0}>
                          <UploadCloud /> Publish Build
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {}} disabled={builds.length === 0}>
                          <Download /> Download Build
                        </DropdownMenuItem>
                      </BuildMenuDropDown>
                    </BuildSelector>
                  </>
                )}
              </div>
              <div className="min-w-0 flex items-center w-full">
                <Button className="w-full flex text-xs" size="sm" variant="outline" onClick={handlePublishModal}>
                  <Code2 className="mr-1" />
                  <span className="flex-grow">Publish Build</span>
                </Button>
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
            <div className="ml-7 pr-4 pl-2 pt-0 flex flex-col gap-4 border-ring border-l border-dashed">
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
    </>
  );
}

const BuildMenuDropDown = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => (
  <DropdownMenu onOpenChange={setOpen} open={open}>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="h-12 w-6 shrink-0 flex-grow" title="Build Menu">
        <Ellipsis /> <span className="sr-only">Build Menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
);
