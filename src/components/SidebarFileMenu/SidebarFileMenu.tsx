"use client";
import { ConnectionsModal } from "@/components/connections-modal";
import { FileTreeMenu, useFileTreeDragAndDrop } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { withCurrentWorkspace, WorkspaceContextType } from "@/context";
import { useFileTreeExpander, useSingleExpander } from "@/hooks/useFileTreeExpander";
import { useToast } from "@/hooks/useToast";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths";
import {
  Check,
  ChevronRight,
  CopyMinus,
  DotIcon,
  Download,
  FilePlus,
  Files,
  FolderPlus,
  Github,
  ChromeIcon as Google,
  Loader,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
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
      className={twMerge("h-full flex-1 p-0 bg-sidebar sidebar-group", props.className)}
    >
      <SidebarFileMenuSync />
      {/* <Separator className="border-sidebar-accent border" /> */}
      <SidebarFileMenuExport />
      {/* <Separator className="border-sidebar-accent border" /> */}
      <div className="flex-1 @container border-1 border-black flex min-h-0">
        <SidebarFileMenuFiles
          fileTreeDir={fileTreeDir}
          renameDirOrFile={renameDirOrFile}
          expandSingle={expandSingle}
          expandForNode={expandForNode}
          expanded={expanded}
        >
          <SidebarGroupContent className="flex h-full items-center">
            <SidebarFileMenuFilesActions
              removeFiles={removeFiles}
              addFile={addFile}
              addDir={addDir}
              setExpandAll={setExpandAll}
            />
          </SidebarGroupContent>
        </SidebarFileMenuFiles>
      </div>
      {/* <Separator className="border-sidebar-accent border" /> */}
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
    <SidebarGroup className="pl-0 pb-12 py-0 pr-0 w-full flex-1 h-full">
      <Collapsible className="group/collapsible h-full flex-1" open={groupExpanded} onOpenChange={groupSetExpand}>
        <SidebarGroupLabel className="relative w-full pr-0 overflow-x-hidden ">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="peer">
              <SidebarGroupLabel className="pl-0">
                <div className="w-full flex items-center">
                  <ChevronRight
                    size={14}
                    className={
                      "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                    }
                  />
                </div>
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <Files className="mr-2" size={12} />
                    Files
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {groupExpanded && (
            <div className="peer-hover:bg-sidebar-accent  h-full flex items-center rounded-none">{children}</div>
          )}
        </SidebarGroupLabel>

        <CollapsibleContent className="h-full">
          <SidebarContent className="overflow-y-scroll h-full scrollbar-thin p-0 pl-4 max-w-full overflow-x-hidden border-l-2 pr-5">
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
          </SidebarContent>
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
  removeFiles,
  addFile,
  addDir,
  setExpandAll,
}: {
  removeFiles: () => void;
  addFile: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
}) => (
  <div className="whitespace-nowrap">
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button onClick={removeFiles} className="p-1 m-0 h-fit" variant="ghost" aria-label="Delete Files">
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
        Delete File(s)
      </TooltipContent>
    </Tooltip>
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button onClick={addFile} className="p-1 m-0 h-fit" variant="ghost" aria-label="Add File">
          <FilePlus />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
        New File
      </TooltipContent>
    </Tooltip>
    <Tooltip delayDuration={3000}>
      <TooltipTrigger asChild>
        <Button onClick={addDir} className="p-1 m-0 h-fit" variant="ghost" aria-label="Add Folder">
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
          aria-label="Expand All"
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
      <SidebarGroup className="pl-0 py-0">
        <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="pl-0">
              <SidebarGroupLabel className="pl-2">
                <div className="w-full flex items-center">
                  <ChevronRight
                    size={14}
                    className={
                      "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                    }
                  />
                </div>
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <RefreshCw size={12} className="mr-2" /> Sync
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <div className="group-data-[state=closed]/collapsible:hidden">
            <ConnectionsModal>
              <SidebarGroupAction className="top-1.5">
                <Plus /> <span className="sr-only">Add Connection</span>
              </SidebarGroupAction>
            </ConnectionsModal>
          </div>

          <CollapsibleContent>
            <SidebarMenu>
              <div className="px-4 pt-2">
                <Button className="w-full " size="sm" variant="outline">
                  <RefreshCw className="mr-1" />
                  Sync Now
                </Button>
              </div>
              <div className="px-4 pt-2">
                <Button className="w-full " size="sm" variant="outline">
                  <Download className="mr-1" />
                  Pull
                </Button>
              </div>
              <div className="px-4 pt-2">
                <Button className="w-full " size="sm" variant="outline">
                  <Upload className="mr-1" />
                  Push
                </Button>
              </div>
            </SidebarMenu>
            <SidebarGroup className="pl-2">
              <SidebarGroupLabel>
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
const DownloadToast = {
  title: "Downloading Workspace...",
  duration: 3000,
  description: (
    <div className="flex items-center">
      <div className="animate-spin w-4 h-4 mr-4">
        <Loader size={12} className="w-4 h-4" />
      </div>
      {"Please wait while we prepare your workspace for download."}
    </div>
  ),
};
function SidebarFileMenuExport() {
  const [expanded, setExpand] = useSingleExpander("export");
  const { toast } = useToast();
  // const promref = useRef(Promise.resolve());
  // const download = useDownloadWorkspace({
  //   onStart: () => {
  //     promref.current = new Promise((rs) => setTimeout(rs, 5000));
  //     toast(DownloadToast);
  //   },
  //   onFinish: () => promref.current.then(() => dismiss()),
  // });
  return (
    <>
      <SidebarGroup>
        <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <SidebarGroupLabel>
                <div className="w-full flex items-center">
                  <ChevronRight
                    size={14}
                    className={
                      "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                    }
                  />
                </div>
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <Download size={12} className="mr-2" />
                    Export
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pt-2 py-4">
              <Button className="w-full text-xs" size="sm" variant="outline" asChild>
                <a
                  href="/download"
                  download
                  onClick={() => setTimeout(toast(DownloadToast).dismiss, DownloadToast.duration)}
                >
                  <Download className="mr-1" />
                  Download Zip
                </a>
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    </>
  );
}
