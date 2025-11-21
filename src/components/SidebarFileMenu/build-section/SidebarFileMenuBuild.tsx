import { BuildModal } from "@/components/BuildModal";
import { useBuildModal } from "@/components/BuildModalContext";
import { useBuildModalCmd } from "@/components/BuildModalContextProvider";
import { useConfirm } from "@/components/Confirm";
import { FileTreeMenuCtxProvider } from "@/components/FileTreeMenuCtxProvider";
import { usePublicationModalCmd } from "@/components/publication-modal/PubicationModalCmdContext";
import { BuildSelector } from "@/components/SidebarFileMenu/build-files-section/BuildSelector";
import { BuildSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/build-files-section/BuildSidebarFileMenuFileSection";
import { useBuildManager } from "@/components/SidebarFileMenu/build-files-section/useBuildManager";
import { SidebarBuildsList } from "@/components/SidebarFileMenu/build-section/SidebarBuildsList";
import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { SelectHighlight } from "@/components/SidebarFileMenu/sync-section/SelectHighlight";
import { Button } from "@/components/ui/button";
// import { Circle } from "lucide";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { BuildDAO } from "@/data/BuildDAO";
import { Workspace } from "@/data/Workspace";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { cn } from "@/lib/utils";
import { Code2, Delete, Download, Ellipsis, Hammer, UploadCloud } from "lucide-react";
import { useState } from "react";
import { timeAgo } from "short-time-ago";

const BuildItem = ({
  build,
}: {
  build: { guid: string; label: string; timestamp: number; Disk: { guid: string } };
}) => (
  <div className="h-full w-full flex justify-start flex-col items-start gap-1 truncate">
    <div className="w-full flex justify-start items-center">{build.label}</div>
    <div className="text-2xs text-muted-foreground truncate w-full flex justify-start items-center">
      {build.Disk.guid} • {timeAgo(new Date(build.timestamp))}
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
  // const { info } = useWorkspaceGitRepo({ currentWorkspace });
  const { cmdRef } = useBuildModalCmd();
  const { openNew } = useBuildModal();
  const { open: openNewPub } = usePublicationModalCmd();
  const { open: openConfirm } = useConfirm();
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const [open, setOpen] = useState(false);
  // const githubConnected = useMemo(() => info.remotes.some((r) => r.url.includes("github.com")), [info]);
  const { storedValue: activeTab, setStoredValue: setActiveTab } = useLocalStorage2<
    "builds" | "files" | "destinations"
  >("SidebarFileMenuBuild/activeTab", "files");

  const { builds, build, setBuildId } = useBuildManager({ currentWorkspace });

  const handleBuildToHTML = async () => {
    try {
      await openNew();
    } catch (error) {
      console.error("Build modal error:", error);
    }
  };
  const handlePublishModal = async () => {
    if (!build) {
      return;
    }
    void openNewPub({ build });
  };

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
      {/* <PublicationModal currentWorkspace={currentWorkspace} cmdRef={pubCmdRef} /> */}
      <BuildModal currentWorkspace={currentWorkspace} cmdRef={cmdRef} />
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
            <div className="pl-4 pr-0 pt-2 pb-2 flex flex-col gap-2">
              <SidebarGroup className="gap-2 flex flex-col">
                {/* {githubConnected && (
                  <Button className="w-full text-xs" size="sm" variant="outline">
                    <Github className="mr-1" />
                    <span className="flex-grow">Push to Github Pages</span>
                  </Button>
                )} */}
                <Button className="w-full flex text-xs" size="sm" variant="outline" onClick={handleBuildToHTML}>
                  <Code2 className="mr-1" />
                  <span className="flex-grow">Build to HTML</span>
                </Button>
              </SidebarGroup>
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
                  <BuildSelector builds={builds} setBuildId={setBuildId} build={build}>
                    <BuildMenuDropDown open={open} setOpen={setOpen} disabled={builds.length === 0}>
                      <DropdownMenuItem onClick={() => setSelectMode("delete")} disabled={builds.length === 0}>
                        <Delete className="text-destructive" /> Delete Build
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!build) return;
                          openNewPub({ build });
                        }}
                        disabled={!build}
                      >
                        <UploadCloud /> Publish Build
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}} disabled={builds.length === 0}>
                        <Download /> Download Build
                      </DropdownMenuItem>
                    </BuildMenuDropDown>
                  </BuildSelector>
                )}
              </div>
              <div className="min-w-0 flex items-center w-full flex-col">
                <Button
                  disabled={!build}
                  className="w-full flex text-xs"
                  size="sm"
                  variant="outline"
                  onClick={handlePublishModal}
                >
                  <UploadCloud className="mr-1" />
                  <span className="flex-grow">Publish Build</span>
                </Button>
              </div>
            </div>
            <div className="pl-4 pt-2 pb-2 flex flex-col">
              <div className="flex gap-4">
                <MiniTab onClick={() => setActiveTab("files")} active={activeTab === "files"}>
                  Files
                </MiniTab>
                <MiniTab onClick={() => setActiveTab("builds")} active={activeTab === "builds"}>
                  Builds
                </MiniTab>
                <MiniTab onClick={() => setActiveTab("destinations")} active={activeTab === "destinations"}>
                  Destinations
                </MiniTab>
              </div>
              <div className="bg-highlight rounded rounded-tl-none py-4 px-2">
                <div>{activeTab === "files" && <BuildSidebarFileExplorer build={build} />}</div>
                <div>{activeTab === "builds" && <SidebarBuildsList workspaceId={currentWorkspace.guid} />}</div>
                <div>{activeTab === "destinations"}</div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    </>
  );
}
// function useMiniTabs<T extends string[]>(defaultTab: T[0]) {
// }
function MiniTab({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      tabIndex={0}
      onClick={onClick}
      className={cn(
        "rounded-t border-muted active:scale-95 active:translate-y-0.5 text-muted-foreground bg-muted/50 hover:text-primary hover:scale-105 transition-transform border-t border-l border-r text-xs p-2 font-mono",
        {
          "bg-muted": active,
          "bg-transparent": !active,
        }
      )}
    >
      {children}
    </button>
  );
}
function BuildSidebarFileExplorer({ build }: { build: BuildDAO | null }) {
  return (
    <div className="pl-4 pr-0 pt-2 pb-2 flex flex-col gap-2">
      <div className="pl-2 pt-0 flex flex-col gap-4 border-ring border-l border-dashed">
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
    </div>
  );
}

const BuildMenuDropDown = ({
  children,
  open,
  setOpen,
  disabled,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}) => (
  <DropdownMenu onOpenChange={setOpen} open={open}>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        disabled={disabled}
        className={cn(
          "w-6 shrink-0 flex-grow",

          {
            "h-12": !disabled,
            "h-8": disabled,
          }
        )}
        title="Build Menu"
      >
        <Ellipsis /> <span className="sr-only">Build Menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
);

// function SidebarBuildListManager({ workspaceId }: { workspaceId: string }) {
//   return <SidebarBuildsList workspaceId={workspaceId} />;
// }
