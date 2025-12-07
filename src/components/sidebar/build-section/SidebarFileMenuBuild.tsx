import { useBuildCreation } from "@/components/build-modal/BuildModalContext";
import { useConfirm } from "@/components/ConfirmContext";
import { FileTreeProvider } from "@/components/filetree/FileTreeContext";
import { FileTreeMenuCtxProvider } from "@/components/filetree/FileTreeMenuContext";
import { useBuildPublisher } from "@/components/publish-modal/PubicationModalCmdContext";
import { SelectableListItemAction } from "@/components/selectable-list/SelectableList";
import { BuildSelector } from "@/components/sidebar/build-files-section/BuildSelector";
import { BuildSidebarFileMenuFileSection } from "@/components/sidebar/build-files-section/BuildSidebarFileMenuFileSection";
import { useBuildManager } from "@/components/sidebar/build-files-section/useBuildManager";
import { MiniTab } from "@/components/sidebar/build-section/AnimatedTabs";
import { SidebarBuildsList } from "@/components/sidebar/build-section/SidebarBuildsList";
import { SidebarDeploymentList } from "@/components/sidebar/build-section/SidebarDeploymentList";
import { SidebarDestinationList } from "@/components/sidebar/build-section/SidebarDestinationList";
import { SidebarGripChevron } from "@/components/sidebar/build-section/SidebarGripChevron";
import { SelectHighlight } from "@/components/sidebar/sync-section/SelectHighlight";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { downloadBuildZipURL } from "@/lib/service-worker/downloadZipURL";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
import { Code2, Delete, Download, Ellipsis, FilesIcon, Hammer, UploadCloud } from "lucide-react";
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
  const { openNew } = useBuildCreation();
  const { open: openNewPub } = useBuildPublisher();
  const { open: openConfirm } = useConfirm();
  const [selectMode, setSelectMode] = useState<"select" | "delete">("select");
  const { storedValue: activeTab, setStoredValue: setActiveTab } = useLocalStorage<
    "builds" | "files" | "destinations" | "deployments"
  >("SidebarFileMenuBuild/activeTab", "files");

  const { builds, build, setBuildId } = useBuildManager({ currentWorkspace });

  const handleBuildToHTML = () => setBuildId(openNew().guid);

  const handlePublishModal = async () => {
    if (!build) return;
    openNewPub({ build });
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
            <div className="pl-4 pr-1 pt-2 pb-2 flex flex-col gap-2">
              <SidebarGroup className="gap-2 flex flex-col">
                <Button className="w-full flex text-xs" size="sm" variant="outline" onClick={handleBuildToHTML}>
                  <Code2 className="mr-1" />
                  <span className="flex-grow">Build to HTML</span>
                </Button>
              </SidebarGroup>
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
              <div className="min-w-0 flex items-center w-full">
                <BuildManager
                  selectMode={selectMode}
                  setSelectMode={setSelectMode}
                  builds={builds}
                  setBuildId={setBuildId}
                  build={build}
                  handleDeleteBuild={handleDeleteBuild}
                  openNewPub={openNewPub}
                />
              </div>
            </div>
            <div className="pr-1 pl-4 pt-2 pb-2 flex flex-col">
              <div className="flex gap-1">
                <MiniTab onClick={() => setActiveTab("files")} active={activeTab === "files"}>
                  Files
                </MiniTab>
                <MiniTab onClick={() => setActiveTab("builds")} active={activeTab === "builds"}>
                  Builds
                </MiniTab>
                <MiniTab onClick={() => setActiveTab("destinations")} active={activeTab === "destinations"}>
                  Destinations
                </MiniTab>
                <MiniTab onClick={() => setActiveTab("deployments")} active={activeTab === "deployments"}>
                  Deployments
                </MiniTab>
              </div>
              <div className="bg-highlight rounded rounded-tl-none pb-4 pt-1 px-2">
                <div>{activeTab === "files" && <BuildSidebarFileExplorer build={build} />}</div>
                <div>
                  {activeTab === "builds" && (
                    <SidebarBuildsList workspaceId={currentWorkspace.guid}>
                      <SelectableListItemAction
                        onClick={(_, build) => {
                          setBuildId(build.guid);
                          setActiveTab("files");
                        }}
                        icon={<FilesIcon className="w-4 h-4" />}
                      >
                        Files
                      </SelectableListItemAction>
                    </SidebarBuildsList>
                  )}
                </div>
                <div>{activeTab === "destinations" && <SidebarDestinationList />}</div>
                <div>{activeTab === "deployments" && <SidebarDeploymentList />}</div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    </>
  );
}
function BuildSidebarFileExplorer({ build }: { build: BuildDAO | null }) {
  return (
    <div className="pl-4 pr-1 pt-2 pb-2 flex flex-col gap-2">
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

function BuildManager({
  selectMode,
  builds,
  setSelectMode,
  setBuildId,
  build,
  handleDeleteBuild,
  openNewPub,
}: {
  selectMode: "select" | "delete";
  builds: BuildDAO[];
  setSelectMode: (mode: "select" | "delete") => void;
  setBuildId: (id: string | null) => void;
  build: BuildDAO | null;
  openNewPub: (params: { build: BuildDAO }) => void;
  handleDeleteBuild: (buildGuid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const downloadBuildURL = build ? downloadBuildZipURL(build.disk.guid!, build.buildPath) : "#";
  return selectMode === "delete" ? (
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
        <DropdownMenuItem onClick={() => build && openNewPub({ build })} disabled={!build}>
          <UploadCloud /> Publish Build
        </DropdownMenuItem>
        <DropdownMenuItem disabled={builds.length === 0} asChild>
          <a href={downloadBuildURL} className="w-full flex">
            <Download /> Download Build
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSelectMode("delete")} disabled={builds.length === 0}>
          <Delete className="text-destructive" /> Delete Build
        </DropdownMenuItem>
      </BuildMenuDropDown>
    </BuildSelector>
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
