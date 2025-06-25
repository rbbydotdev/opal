"use client";
import { ConnectionsModal } from "@/components/connections-modal";
import { FileTreeMenu, handleFileTreePaste } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EncryptedZipDialog } from "@/components/ui/encrypted-zip-dialog";

import { FileTreeMenuCtxProvider, useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
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
import { SidebarDndList } from "@/components/ui/SidebarDndList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useExternalDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { FileTreeExpanderProvider } from "@/features/filetree-expander/FileTreeExpanderContext";
import { useFileTreeExpanderContext } from "@/features/filetree-expander/useFileTreeExpander";
import { useSidebarItemExpander } from "@/features/filetree-expander/useSidebarItemExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDir, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import { downloadEncryptedZipHelper } from "@/lib/ServiceWorker/downloadEncryptedZipHelper";
import clsx from "clsx";
import {
  Check,
  ChevronRight,
  Code2,
  CopyMinus,
  Delete,
  DotIcon,
  Download,
  FilePlus,
  Files,
  FileTextIcon,
  FolderPlus,
  Github,
  GitMerge,
  ChromeIcon as Google,
  Info,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  UploadCloudIcon,
} from "lucide-react";
import React, { JSX, useEffect, useMemo } from "react";
import { twMerge } from "tailwind-merge";

export function SidebarFileMenu({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { currentWorkspace } = useWorkspaceContext();
  const { externalDrop } = useExternalDrop({ currentWorkspace });
  return (
    <SidebarGroup
      {...props}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => externalDrop(e, TreeNode.FromPath(absPath("/"), "dir"))}
      className={twMerge("p-0 bg-sidebar sidebar-group h-full", props.className)}
    >
      <SidebarDndList storageKey={"sidebarMenu"}>
        <SidebarFileMenuPublish dnd-id="publish" className="flex-shrink flex" />
        <SidebarFileMenuSync dnd-id="sync" className="flex-shrink flex flex-col min-h-8" />
        <SidebarFileMenuExport dnd-id="export" className="flex-shrink flex" />

        <div dnd-id="trash" className="min-h-8">
          <FileTreeMenuCtxProvider id="TrashFiles">
            <TrashSidebarFileMenuFileSection />
          </FileTreeMenuCtxProvider>
        </div>

        <div className="min-h-8" dnd-id="files">
          <FileTreeMenuCtxProvider id="MainFiles">
            <FileTreeExpanderProvider>
              <MainSidebarFileMenuFileSection />
            </FileTreeExpanderProvider>
          </FileTreeMenuCtxProvider>
        </div>
      </SidebarDndList>

      {/* <Separator className="border-sidebar-accent border" /> */}
    </SidebarGroup>
  );
}

const TinyNotice = () => <div className="ml-1 mb-2 bg-ring w-1 h-1 rounded-full"></div>;

function TrashSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { removeFile } = useWorkspaceFileMgmt(currentWorkspace);
  return (
    <FileTreeExpanderProvider>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarFileMenuFileSectionInternal
            Icon={Trash2}
            title={
              <>
                Trash
                {currentWorkspace.hasTrash() && <TinyNotice />}
              </>
            }
            className={className}
            scope={absPath("/.trash")}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem className="flex gap-2" onClick={() => removeFile(absPath("/.trash"))}>
            <Delete className="mr-3 h-4 w-4" />
            Empty
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </FileTreeExpanderProvider>
  );
}

function MainSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused, selectedFocused, setFileTreeCtx } = useFileTreeMenuCtx();
  const { trashSelectedFiles, addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { setExpandAll, expandForNode } = useFileTreeExpanderContext();

  //attach paste listeners
  useEffect(() => {
    const handlePasteEvent = async (event: ClipboardEvent) => {
      //handlefiles
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        const images = Array.from([...(files ?? [])]).filter((file) => file.type.startsWith("image/")); //TODO isImage
        const markdowns = Array.from([...(files ?? [])]).filter((file) => file.type === "text/markdown");
        if (images.length || markdowns.length) {
          event.preventDefault();
          event.stopPropagation();
          const selectedNode = currentWorkspace.nodeFromPath(focused);
          const destPath = (selectedNode ?? TreeNode.FromPath(absPath("/"), "dir")).closestDirPath();
          if (images && images.length > 0) {
            console.debug("FileTreeMenu window paste event capture for files:" + images.length);
            await currentWorkspace.uploadMultipleImages(images, destPath);
          }
          if (markdowns && markdowns.length > 0) {
            console.debug("FileTreeMenu window paste event capture for markdown files:" + markdowns.length);
            await currentWorkspace.newFiles(
              await Promise.all(markdowns.map(async (file) => [joinPath(destPath, file.name), await file.text()]))
            );
          }
        }
      }
      if (event.clipboardData?.getData("text/plain")) {
        const text = event.clipboardData.getData("text/plain");
        if (text) {
          await handleFileTreePaste(
            currentWorkspace,
            currentWorkspace.nodeFromPath(selectedFocused[0])?.closestDirPath() || absPath("/")
          );
        }
      }
      void navigator.clipboard.writeText("");
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      });
    };
    const handleCutEvent = () => {
      void copyFileNodesToClipboard({
        fileNodes: selectedFocused,
        action: "cut",
        workspaceId: currentWorkspace.name,
      });
    };
    const handleCopyEvent = () => {
      void copyFileNodesToClipboard({
        fileNodes: selectedFocused,
        action: "copy",
        workspaceId: currentWorkspace.name,
      });
    };
    window.addEventListener("paste", handlePasteEvent);
    window.addEventListener("cut", handleCutEvent);
    window.addEventListener("copy", handleCopyEvent);
    return () => {
      window.removeEventListener("paste", handlePasteEvent);
      window.removeEventListener("cut", handleCutEvent);
      window.removeEventListener("copy", handleCopyEvent);
    };
  }, [currentWorkspace, focused, selectedFocused, setFileTreeCtx]);
  return (
    <SidebarFileMenuFileSectionInternal title={"Files"} className={className} filter={[absPath("/.trash")]}>
      <SidebarFileMenuFilesActions
        trashSelectedFiles={trashSelectedFiles}
        addFile={() => expandForNode(addDirFile("file", focused || absPath("/")), true)}
        addDir={() => expandForNode(addDirFile("dir", focused || absPath("/")), true)}
        setExpandAll={setExpandAll}
      />
    </SidebarFileMenuFileSectionInternal>
  );
}

function SidebarFileMenuFileSectionInternal({
  title,
  className,
  scope,
  filter,
  children,
  Icon = Files,
  ...rest
}: {
  title: JSX.Element | string;
  className?: string;
  scope?: AbsPath;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  children?: React.ReactNode;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const { expandSingle, expanded, expandForNode } = useFileTreeExpanderContext();
  const { fileTreeDir, currentWorkspace } = useWorkspaceContext();
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

  const treeNode = useMemo(
    () => (typeof scope === "undefined" ? fileTreeDir : currentWorkspace.nodeFromPath(scope ?? null)),
    [currentWorkspace, fileTreeDir, scope]
  );
  return (
    <SidebarFileMenuFiles
      {...rest}
      title={title}
      Icon={Icon}
      className={twMerge("min-h-8", className)}
      filter={filter}
      fileTreeDir={treeNode as TreeDirRoot}
      renameDirOrFileMultiple={renameDirOrFileMultiple}
      expandSingle={expandSingle}
      expandForNode={expandForNode}
      expanded={expanded}
    >
      <SidebarGroupContent className="flex h-full items-center">{children}</SidebarGroupContent>
    </SidebarFileMenuFiles>
  );
}

export const SidebarFileMenuFiles = ({
  fileTreeDir,
  renameDirOrFileMultiple,
  expandSingle,
  expandForNode,
  expanded,
  children,
  className,
  filter,
  title,
  Icon = Files,
  ...rest
}: {
  fileTreeDir: TreeDirRoot;
  className?: string;
  expandSingle: (path: string, expanded: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [key: string]: boolean };
  renameDirOrFileMultiple: (nodes: [TreeNode, TreeNode | AbsPath][]) => Promise<unknown>;
  title: JSX.Element | string;
  children: React.ReactNode;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}) => {
  const { id } = useFileTreeMenuCtx();
  const [groupExpanded, groupSetExpand] = useSidebarItemExpander("SidebarFileMenuFiles/" + id);
  const { currentWorkspace } = useWorkspaceContext();
  const { externalDrop } = useExternalDrop({ currentWorkspace });

  return (
    <SidebarGroup className={clsx("pl-0 pb-12 py-0 pr-0 w-full", className)} {...rest}>
      <Collapsible
        className="group/collapsible _h-full _flex-1 flex flex-col min-h-0"
        open={groupExpanded}
        onOpenChange={groupSetExpand}
      >
        <SidebarGroupLabel className="relative w-full pr-0 overflow-x-hidden ">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="peer">
              <SidebarGroupLabel className="pl-0">
                <div className="flex items-center">
                  <ChevronRight
                    size={14}
                    className={
                      "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                    }
                  />
                </div>
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <Icon className="mr-2" size={12} />
                    {title}
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {groupExpanded && (
            <div className="peer-hover:bg-sidebar-accent  h-full flex items-center rounded-none">{children}</div>
          )}
        </SidebarGroupLabel>

        <CollapsibleContent className="min-h-0 flex-shrink">
          <SidebarContent className="overflow-y-auto h-full scrollbar-thin p-0 pb-2 pl-4 max-w-full overflow-x-hidden border-l-2 pr-5 group">
            {!Object.keys(fileTreeDir?.filterOutChildren?.(filter) ?? {}).length ? (
              <div className="w-full" onDrop={(e) => externalDrop(e, TreeNode.FromPath(absPath("/"), "dir"))}>
                <SidebarGroupLabel className="text-center _m-2 _p-4 italic border-dashed border h-full group-hover:bg-sidebar-accent">
                  <div className="w-full ">
                    {/* No Files, Click <FilePlus className={"inline"} size={12} /> to get started */}
                    <span className="text-3xs">empty</span>
                  </div>
                </SidebarGroupLabel>
              </div>
            ) : (
              <FileTreeMenu
                fileTreeDir={fileTreeDir as TreeDir}
                expand={expandSingle}
                filter={filter}
                renameDirOrFileMultiple={renameDirOrFileMultiple}
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

const SidebarFileMenuFilesActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  setExpandAll,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
}) => (
  <div className="whitespace-nowrap">
    <Button
      onClick={trashSelectedFiles}
      className="p-1 m-0 h-fit"
      variant="ghost"
      aria-label="Trash Files"
      title="Trash Files"
    >
      <Trash2 />
    </Button>
    <Button onClick={addFile} className="p-1 m-0 h-fit" variant="ghost" aria-label="Add File" title="New File">
      <FilePlus />
    </Button>
    <Button onClick={addDir} className="p-1 m-0 h-fit" variant="ghost" aria-label="Add Folder" title="New Folder">
      <FolderPlus />
    </Button>
    <Button
      aria-label="Expand All"
      onDoubleClick={() => setExpandAll(true)}
      onClick={() => setExpandAll(false)}
      className="p-1 m-0 h-fit"
      variant="ghost"
      title="Collapse All"
    >
      <CopyMinus />
    </Button>
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

function SidebarFileMenuSync(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSidebarItemExpander("sync");
  return (
    <SidebarGroup className="pl-0 py-0" {...props}>
      <Collapsible className="group/collapsible flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="pl-0">
            <SidebarGroupLabel className="pl-2">
              <div className="flex items-center">
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

        <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
          <SidebarMenu>
            <div className="px-4 pt-2">
              <Button className="w-full " size="sm" variant="outline">
                <GitMerge className="mr-1" />
                Commit
              </Button>
            </div>
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
                        <div className="w-4 h-4 text-success items-center justify-center flex">
                          <Check size={10} strokeWidth={4} />
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
  );
}
function SidebarFileMenuPublish(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSidebarItemExpander("publish");
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <div className="flex items-center">
                <ChevronRight
                  size={14}
                  className={
                    "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                  }
                />
              </div>
              <div className="w-full">
                <div className="flex justify-center items-center">
                  <UploadCloudIcon size={12} className="mr-2" />
                  Publish
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-4">
            <SidebarGroup className="gap-2 flex flex-col">
              <SidebarGroupLabel>Workspace Actions</SidebarGroupLabel>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <UploadCloud className="mr-1" />
                Publish to Web
              </Button>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <Code2 className="mr-1" />
                Publish to HTML
              </Button>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <FileTextIcon className="mr-1" />
                Publish to PDF
              </Button>
            </SidebarGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

function SidebarFileMenuExport(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSidebarItemExpander("export");
  const { currentWorkspace } = useWorkspaceContext();
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <div className="flex items-center">
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
                  Download
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-2">
            <Button className="w-full text-xs" size="sm" variant="outline" asChild>
              <a href="/download.zip">
                <Download className="mr-1" />
                Download Zip
              </a>
            </Button>
            <EncryptedZipDialog
              onSubmit={(password) =>
                downloadEncryptedZipHelper({ password, encryption: "aes", name: currentWorkspace.name })
              }
            >
              <Button className="w-full text-xs relative group" size="sm" variant="outline" asChild>
                <div>
                  <Lock className="inline" />
                  <div className="absolute -top-0 right-0 group-hover:block hidden">
                    <Tooltip>
                      <TooltipTrigger>
                        <Info />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>AES, probably not secure - but its a cool idea!</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  Download Encrypted Zip
                </div>
              </Button>
            </EncryptedZipDialog>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function SidebarCollapseContentScroll(
  props: React.ComponentProps<typeof SidebarGroup> & {
    name: string;
    action?: React.ReactNode;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    children: React.ReactNode;
  }
) {
  const [expanded, setExpand] = useSidebarItemExpander(props.name);
  const { name, icon: Icon, action, children, ...rest } = props;
  return (
    <SidebarGroup className="pl-0 py-0" {...rest}>
      <Collapsible
        className="group/collapsible group/collapsible flex flex-col min-h-0"
        open={expanded}
        onOpenChange={setExpand}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="pl-0">
            <SidebarGroupLabel className="pl-2">
              <div className="flex items-center">
                <ChevronRight
                  size={14}
                  className={
                    "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                  }
                />
              </div>
              <div className="w-full">
                <div className="flex justify-center items-center capitalize">
                  <Icon size={12} className="mr-2" /> {name}
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {action && <div className="group-data-[state=closed]/collapsible:hidden">{action}</div>}

        <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">{children}</CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
