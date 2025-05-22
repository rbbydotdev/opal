"use client";
import { ConnectionsModal } from "@/components/connections-modal";
import { FileTreeMenu, useFileTreeDragAndDrop } from "@/components/FiletreeMenu";
import { ClosedChevron, OpenedChevron } from "@/components/SidebarFileMenu/Icons";
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
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { useWorkspaceFileMgmt } from "@/components/useWorkspaceFileMgmt";
import { withCurrentWorkspace, WorkspaceContextType } from "@/context";
import { Workspace } from "@/Db/Workspace";
import { TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths";
import {
  CopyMinus,
  FilePlus,
  FolderPlus,
  Github,
  ChromeIcon as Google,
  Plus,
  Settings,
  Trash2,
  Undo,
  UploadIcon,
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
  const { renameFile, addDirFile, removeFiles } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
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
    <>
      <SidebarGroup
        {...props}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={twMerge("h-full p-0 bg-secondary sidebar-group", props.className)}
      >
        <SidebarGroupContent className="flex justify-end">
          <SidebarFileMenuFilesActions
            isSettingsView={isSettingsView}
            currentWorkspace={currentWorkspace}
            removeFiles={removeFiles}
            addFile={addFile}
            addDir={addDir}
            setExpandAll={setExpandAll}
          />
        </SidebarGroupContent>
        <SidebarFileMenuPublish />
        <SidebarFileMenuConnections />
        <SidebarFileMenuFiles
          fileTreeDir={fileTreeDir}
          renameFile={renameFile}
          expandSingle={expandSingle}
          expandForNode={expandForNode}
          expanded={expanded}
        />
      </SidebarGroup>
    </>
  );
}

export const SidebarFileMenuFiles = ({
  fileTreeDir,
  renameFile,
  expandSingle,
  expandForNode,
  expanded,
}: {
  fileTreeDir: TreeDirRoot;
  expandSingle: (path: string, expanded: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [key: string]: boolean };
  renameFile: (oldNode: TreeNode, newFullPath: AbsPath) => Promise<AbsPath>;
}) => (
  <SidebarGroup className="pb-12 h-full">
    <SidebarGroupLabel>
      <div className="w-full">Files</div>
    </SidebarGroupLabel>
    <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pl-3 pb-16 max-w-full overflow-x-hidden">
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
          renameDirOrFile={renameFile}
          expand={expandSingle}
          expandForNode={expandForNode}
          expanded={expanded}
          depth={0}
        />
      )}
    </SidebarGroupContent>
  </SidebarGroup>
);

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
function SidebarFileMenuConnections() {
  return (
    <>
      <SidebarGroup>
        <Collapsible className="group">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="pl-0">
              <SidebarGroupLabel className="pl-1">
                <OpenedChevron className="pr-1 group:data-[state=open]:hidden" />
                <ClosedChevron className="pr-1 group:data-[state=closed]:hidden" />
                <div className="w-full">Connections</div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <ConnectionsModal>
            <SidebarGroupAction>
              <Plus />
            </SidebarGroupAction>
          </ConnectionsModal>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {MOCK_CONNECTIONS.map((connection) => (
                  <SidebarMenuItem key={connection.name}>
                    <SidebarMenuButton className="flex justify-start w-full text-xs p-1">
                      <div className="w-full whitespace-nowrap flex items-center space-x-1">
                        <span className="rounded-full p-1 border stroke-sidebar-ring">
                          {VENDOR_ICONS[connection.vendor as keyof typeof VENDOR_ICONS]}
                        </span>
                        <span className="overflow-hidden text-ellipsis">{connection.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    </>
  );
}

function SidebarFileMenuPublish() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <div className="w-full">Publish</div>
        <SidebarGroupAction>
          <UploadIcon />
        </SidebarGroupAction>
      </SidebarGroupLabel>
      <SidebarGroupContent></SidebarGroupContent>
    </SidebarGroup>
  );
}
