"use client";
import { ConnectionsModal } from "@/components/connections-modal";
import { FileTreeMenu, useFileTreeDragAndDrop } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander, useSingleExpander } from "@/components/useFileTreeExpander";
import { useWorkspaceFileMgmt } from "@/components/useWorkspaceFileMgmt";
import { withCurrentWorkspace, WorkspaceContextType } from "@/context";
import { Workspace } from "@/Db/Workspace";
import { TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CopyMinus,
  DotIcon,
  Download,
  FilePlus,
  Files,
  FolderPlus,
  Github,
  ChromeIcon as Google,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Undo,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";
import { twMerge } from "tailwind-merge";

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  isIndexed,
  flatTree,
  firstFile,
  workspaces,
  ...props
}: WorkspaceContextType & React.ComponentProps<typeof SidebarGroup>) {
  const { renameDirOrFile, addDirFile, removeFiles } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { setExpandAll, expandSingle, expanded, expandForNode } = useFileTreeExpander({
    fileDirTree: flatTree,
    currentPath: workspaceRoute.path,
    id: currentWorkspace.id,
  });

  const addDirFileAndExpand = useCallback(
    (type: TreeNode["type"]) => {
      const newNode = addDirFile(type);
      expandForNode(newNode, true);
      return newNode;
    },
    [addDirFile, expandForNode]
  );
  const addFile = useCallback(() => {
    addDirFileAndExpand("file");
  }, [addDirFileAndExpand]);
  const addDir = useCallback(() => {
    addDirFileAndExpand("dir");
  }, [addDirFileAndExpand]);

  const route = usePathname();

  const isSettingsView = route.endsWith("/settings"); //TODO may need to make a resuable hook to consolidate this logic
  const { handleDrop } = useFileTreeDragAndDrop({
    currentWorkspace,
  });

  //use

  return (
    <SidebarGroup
      {...props}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={twMerge("h-full flex-1 p-0 bg-secondary sidebar-group", props.className)}
    >
      <div className="flex-shrink overflow-y-auto">
        <SidebarFileMenuSync />
      </div>
      <div className="flex-1 overflow-y-auto @container">
        <SidebarFileMenuFiles
          fileTreeDir={fileTreeDir}
          renameDirOrFile={renameDirOrFile}
          expandSingle={expandSingle}
          expandForNode={expandForNode}
          expanded={expanded}
        >
          <SidebarGroupContent className="flex h-full overflow-scroll ">
            <SidebarFileMenuFilesActions
              isSettingsView={isSettingsView}
              currentWorkspace={currentWorkspace}
              removeFiles={removeFiles}
              addFile={addFile}
              addDir={addDir}
              setExpandAll={setExpandAll}
            />
            {/* <div className="@container foobar bg-blue-500 w-48"></div> */}
          </SidebarGroupContent>
        </SidebarFileMenuFiles>
      </div>
    </SidebarGroup>
  );
}

export const SidebarFileMenuFiles = ({
  fileTreeDir,
  renameDirOrFile,
  expandSingle,
  expandForNode,
  expanded,
  children,
}: {
  fileTreeDir: TreeDirRoot;
  expandSingle: (path: string, expanded: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [key: string]: boolean };
  renameDirOrFile: (oldNode: TreeNode, newFullPath: AbsPath, type: "file" | "dir") => Promise<AbsPath>;
  children: React.ReactNode;
}) => {
  const [groupExpanded, groupSetExpand] = useSingleExpander("files");

  return (
    <SidebarGroup className="pl-0 pb-12 w-full overflow-scroll h-full flex-1">
      <Collapsible className="group/collapsible h-full flex-1" open={groupExpanded} onOpenChange={groupSetExpand}>
        <SidebarGroupLabel className="relative w-full pr-0">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="pl-0 text-xs w-full ">
              <div className="w-full flex items-center">
                <ChevronDown size={14} className="group-data-[state=closed]/collapsible:hidden -ml-0.5" />
                <ChevronRight size={14} className="group-data-[state=open]/collapsible:hidden -ml-0.5" />
                <Files className="mr-2" size={12} />
                Files
              </div>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {/* {groupExpanded && <div className="absolute right-0 @[200px]:bg-blue-600">{children}</div>} */}
          {groupExpanded && <div>{children}</div>}
        </SidebarGroupLabel>

        <CollapsibleContent className="h-full">
          <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pl-4 pt-3 max-w-full overflow-x-hidden border-l-2 pr-5">
            {!Object.keys(fileTreeDir.children).length ? (
              <div className="w-full">
                <SidebarGroupLabel className="text-center m-2 p-4 italic border-dashed border h-full">
                  <div className="w-full">
                    No Files, Click <FilePlus className={"inline"} size={12} /> to get started
                  </div>
                </SidebarGroupLabel>
              </div>
            ) : (
              <FileTreeMenu
                renameDirOrFile={renameDirOrFile}
                expand={expandSingle}
                expandForNode={expandForNode}
                expanded={expanded}
                depth={0}
              />
            )}
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
};

const SidebarFileMenuWithWorkspace = withCurrentWorkspace(SidebarFileMenuInternal);

export const SidebarFileMenu = (props: React.ComponentProps<typeof SidebarGroup>) => {
  return <SidebarFileMenuWithWorkspace {...props} />;
};

const SidebarFileMenuFilesActions = ({
  isSettingsView,
  currentWorkspace,
  removeFiles,
  addFile,
  addDir,
  setExpandAll,
}: {
  isSettingsView: boolean;
  currentWorkspace: Workspace;
  removeFiles: () => void;
  addFile: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
}) => (
  <div className="whitespace-nowrap">
    {isSettingsView ? (
      <Tooltip delayDuration={3000}>
        <TooltipTrigger asChild>
          <Button className="p-1 m-0 h-fit" variant="ghost" asChild>
            <Link href={currentWorkspace.href}>
              <Undo />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" align="center">
          Return to Workspace
        </TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip delayDuration={3000}>
        <TooltipTrigger asChild>
          <Button className="p-1 m-0 h-fit" variant="ghost" asChild>
            <Link href={currentWorkspace.subRoute("settings")}>
              <Settings />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" align="center">
          Workspace Settings
        </TooltipContent>
      </Tooltip>
    )}

    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button onClick={removeFiles} className="p-1 m-0 h-fit" variant="ghost">
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
        Delete File(s)
      </TooltipContent>
    </Tooltip>
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button onClick={addFile} className="p-1 m-0 h-fit" variant="ghost">
          <FilePlus />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
        New File
      </TooltipContent>
    </Tooltip>
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button onClick={addDir} className="p-1 m-0 h-fit" variant="ghost">
          <FolderPlus />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
        New Folder
      </TooltipContent>
    </Tooltip>
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button
          onDoubleClick={() => setExpandAll(true)}
          onClick={() => setExpandAll(false)}
          className="p-1 m-0 h-fit"
          variant="ghost"
        >
          <CopyMinus />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
        Collapse All
      </TooltipContent>
    </Tooltip>
  </div>
);
const VENDOR_ICONS = {
  GitHub: <Github size={12} />,
  Google: <Google size={12} />,
};
const MOCK_CONNECTIONS = [
  {
    name: "GitHub",
    type: "oauth",
    vendor: "GitHub",
  },
  {
    name: "GitHub API",
    type: "apikey",
    vendor: "GitHub",
  },
  {
    name: "Google Drive",
    type: "oauth",
    vendor: "Google",
  },
  {
    name: "Google Drive API",
    type: "apikey",
    vendor: "Google",
  },
];

function SidebarFileMenuSync() {
  const [expanded, setExpand] = useSingleExpander("sync");
  return (
    <>
      <SidebarGroup className="pl-0">
        <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="pl-0">
              <SidebarGroupLabel className="pl-2">
                <div className="w-full flex items-center">
                  <ChevronDown size={14} className={"group-data-[state=closed]/collapsible:hidden -ml-0.5"} />
                  <ChevronRight size={14} className={"group-data-[state=open]/collapsible:hidden -ml-0.5"} />
                </div>
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <RefreshCw size={12} className="mr-2" /> Sync
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <ConnectionsModal>
            <SidebarGroupAction>
              <Plus />
            </SidebarGroupAction>
          </ConnectionsModal>
          <CollapsibleContent>
            <SidebarMenu>
              <div className="px-4 pt-2">
                <Button className="w-full" variant="outline">
                  <RefreshCw size={12} className="mr-2" />
                  Sync Now
                </Button>
              </div>
              <div className="px-4 pt-2">
                <Button className="w-full" variant="outline">
                  <Download size={12} className="mr-2" />
                  Pull
                </Button>
              </div>
              <div className="px-4 pt-2">
                <Button className="w-full" variant="outline">
                  <Upload size={12} className="mr-2" />
                  Push
                </Button>
              </div>
            </SidebarMenu>
            <SidebarGroup>
              <SidebarGroupLabel className="pl-1">
                <div className="w-full text-xs text-sidebar-foreground/70">Connections</div>
              </SidebarGroupLabel>
              <SidebarMenu>
                {MOCK_CONNECTIONS.map((connection, i) => (
                  <SidebarMenuItem key={connection.name}>
                    <SidebarMenuButton className="flex justify-start w-full text-xs p-1">
                      <div className="w-full whitespace-nowrap flex items-center space-x-1">
                        {i === 0 ? (
                          <div className="w-4 h-4 stroke-success items-center justify-center flex">
                            <Check size={10} strokeWidth={4} stroke="current" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 items-center justify-center flex">
                            <DotIcon size={14} strokeWidth={4} fill="black" />
                          </div>
                        )}
                        <span className="rounded-full p-1 border">
                          {VENDOR_ICONS[connection.vendor as keyof typeof VENDOR_ICONS]}
                        </span>
                        <span className="overflow-hidden text-ellipsis">{connection.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    </>
  );
}

function CustomSidebarActionButton({ title, Icon }: { title: string; Icon: React.ComponentType<{ size?: number }> }) {
  return (
    <SidebarGroup>
      <SidebarMenuButton className="pl-0 text-xs w-full flex justify-between text-sidebar-foreground/70 hover:text-sidebar-foreground/70">
        <div className="flex justify-center items-center">
          <div className="ml-1">
            <Icon size={12} />
          </div>
          <div className="ml-1">{title}</div>
        </div>
      </SidebarMenuButton>
      <SidebarGroupContent></SidebarGroupContent>
    </SidebarGroup>
  );
}
