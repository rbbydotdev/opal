import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useFileTreeClipboardEventListeners } from "@/components/SidebarFileMenu/hooks/useFileTreeClipboardEventListeners";
import { useFlashTooltip } from "@/components/SidebarFileMenu/main-files-section/useFlashTooltip";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { getDiskTypeLabel } from "@/Db/Disk";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { useFiletreeMenuContextMenuActions } from "@/components/FiletreeMenu";
import { absPath } from "@/lib/paths2";
import { useLeftWidth } from "@/app/EditorSidebarLayout";
import { useZoom } from "@/lib/useZoom";
import { cn } from "@/lib/utils";
import { ClipboardCopy, ClipboardPasteIcon, CopyMinus, Ellipsis, FileCode2Icon, FileEditIcon, FolderPlus, Info, Scissors, Trash2 } from "lucide-react";
import { ComponentProps, useMemo, useState } from "react";

const Banner = ({ currentWorkspace }: { currentWorkspace: Workspace }) => {
  const [dragEnter, setDragEnter] = useState(false);
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

  const { setFileTreeCtx } = useFileTreeMenuCtx();
  const handleClick = () => {
    setFileTreeCtx({
      anchorIndex: -1,
      editing: null,
      editType: null,
      focused: absPath("/"),
      virtual: null,
      selectedRange: [],
    });
  };
  const { handleDrop } = useFileTreeDragDrop({ currentWorkspace, onMoveMultiple: renameDirOrFileMultiple });
  return (
    <MainFileTreeContextMenu fileNode={RootNode} currentWorkspace={currentWorkspace}>
      <div
        className={cn(
          "mb-[5px] visible cursor-pointer h-4 transition-all group/banner w-[calc(100%-2rem)] z-10 pl-2 border-dashed hover:border font-mono text-2xs flex justify-center items-center",
          { "border h-8 bg-sidebar scale-110 mt-1": dragEnter }
          // { "mb-[5px] visible": hasDepth },
          // { "invisible h-2": !hasDepth }
        )}
        onDrop={(e) => handleDrop(e, RootNode)}
        onDragEnter={() => setDragEnter(true)}
        onDragLeave={() => setDragEnter(false)}
        onMouseLeave={() => setDragEnter(false)}
        onClick={handleClick}
        title={"File Tree Root"}
      >
        <span className={cn("group-hover/banner:block hidden", { block: dragEnter })}>root</span>
      </div>
    </MainFileTreeContextMenu>
  );
};
export function MainSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { trashSelectedFiles, addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { setExpandAll, expandForNode } = useTreeExpanderContext();

  const { fileTreeDir } = useFileTree();

  useFileTreeClipboardEventListeners({ currentWorkspace, elementSelector: "[data-sidebar-file-menu]" });

  const diskType = useMemo(() => getDiskTypeLabel(currentWorkspace.getDisk().type), [currentWorkspace]);

  return (
    <>
      <SidebarFileMenuFiles
        data-main-sidebar
        FileItemContextMenu={MainFileTreeContextMenu} // <MainFileTreeContextMenu ...
        title={"Files"}
        className={className}
        contentBanner={!fileTreeDir.isEmpty() ? <Banner currentWorkspace={currentWorkspace} /> : null}
        filter={SpecialDirs.All} // Exclude trash and git directories etc
      >
        <span className="block group-data-[state=closed]/collapsible:hidden">
          <SidebarFileMenuFilesActions
            trashSelectedFiles={trashSelectedFiles}
            addFile={() => expandForNode(addDirFile("file", focused || absPath("/")), true)}
            addCssFile={() => expandForNode(addDirFile("file", focused || absPath("/"), "styles.css"), true)}
            addDir={() => expandForNode(addDirFile("dir", focused || absPath("/")), true)}
            setExpandAll={setExpandAll}
            diskType={diskType}
            currentWorkspace={currentWorkspace}
          />
        </span>
        {!fileTreeDir.isEmpty() && <TinyNotice />}
      </SidebarFileMenuFiles>
    </>
  );
}
const ActionButton = ({
  children,
  className,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Button>) => {
  return (
    <Button {...rest} className={cn("p-1 m-0 h-auto !bg-transparent", className)} variant="ghost">
      {children}
    </Button>
  );
};
const FileMenuActionButtonRow = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  setExpandAll,
  diskType,
  copyFiles,
  cutFiles,
  pasteFiles,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
  copyFiles: () => void;
  cutFiles: () => void;
  pasteFiles: () => void;
}) => {
  const [open, toggle] = useFlashTooltip();

  return (
    <div className="whitespace-nowrap gap-1 flex items-center justify-center p-1">
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <ActionButton onClick={toggle} aria-label={diskType} title={diskType}>
            <Info />
          </ActionButton>
        </TooltipTrigger>
        <TooltipContent>{diskType}</TooltipContent>
      </Tooltip>
      <ActionButton onClick={copyFiles} aria-label="Copy Files" title="Copy Files">
        <ClipboardCopy />
      </ActionButton>
      <ActionButton onClick={cutFiles} aria-label="Cut Files" title="Cut Files">
        <Scissors />
      </ActionButton>
      <ActionButton onClick={pasteFiles} aria-label="Paste Files" title="Paste Files">
        <ClipboardPasteIcon />
      </ActionButton>
      <ActionButton onClick={trashSelectedFiles} aria-label="Trash Files" title="Trash Files">
        <Trash2 />
      </ActionButton>
      <ActionButton onClick={addFile} aria-label="New Markdown File" title="New Markdown File">
        <FileEditIcon />
      </ActionButton>
      <ActionButton onClick={addCssFile} aria-label="New Css File" title="New Css File">
        <FileCode2Icon />
      </ActionButton>
      <ActionButton onClick={addDir} aria-label="Add Folder" title="New Folder">
        <FolderPlus />
      </ActionButton>
      <ActionButton
        title="Collapse All"
        aria-label="Expand All"
        onDoubleClick={() => setExpandAll(true)}
        onClick={() => setExpandAll(false)}
      >
        <CopyMinus />
      </ActionButton>
    </div>
  );
};

const FileMenuCompactActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  setExpandAll,
  diskType,
  copyFiles,
  cutFiles,
  pasteFiles,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
  copyFiles: () => void;
  cutFiles: () => void;
  pasteFiles: () => void;
}) => {
  return (
    <div className="flex items-center justify-center p-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="p-1 m-0 !bg-transparent"
            variant="ghost"
            aria-label="File Menu Actions"
            title="File Menu Actions"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={copyFiles}>
            <ClipboardCopy className="w-4 h-4 mr-2" />
            Copy Files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={cutFiles}>
            <Scissors className="w-4 h-4 mr-2" />
            Cut Files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={pasteFiles}>
            <ClipboardPasteIcon className="w-4 h-4 mr-2" />
            Paste Files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={addFile}>
            <FileEditIcon className="w-4 h-4 mr-2" />
            New Markdown File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={addCssFile}>
            <FileCode2Icon className="w-4 h-4 mr-2" />
            New CSS File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={addDir}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={trashSelectedFiles}>
            <Trash2 className="w-4 h-4 mr-2" />
            Trash Files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExpandAll(false)}>
            <CopyMinus className="w-4 h-4 mr-2" />
            Collapse All
          </DropdownMenuItem>
          <DropdownMenuItem onDoubleClick={() => setExpandAll(true)} onClick={() => setExpandAll(true)}>
            <CopyMinus className="w-4 h-4 mr-2" />
            Expand All
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Info className="w-4 h-4 mr-2" />
            {diskType}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const SidebarFileMenuFilesActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  setExpandAll,
  diskType,
  currentWorkspace,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void; // Optional for future use
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
  currentWorkspace: Workspace;
}) => {
  const { copy, cut, paste } = useFiletreeMenuContextMenuActions({ currentWorkspace });
  const { selectedFocused, focused } = useFileTreeMenuCtx();
  const { show: showToast, cmdRef: toastRef } = useTooltipToastCmd();
  
  const copyFiles = () => {
    const selectedNodes = currentWorkspace.nodesFromPaths(selectedFocused);
    if (selectedNodes.length > 0) {
      copy(selectedNodes);
      showToast(`Copied ${selectedNodes.length} item${selectedNodes.length === 1 ? '' : 's'}`, "success");
    } else {
      showToast("No files selected", "destructive");
    }
  };
  
  const cutFiles = () => {
    const selectedNodes = currentWorkspace.nodesFromPaths(selectedFocused);
    if (selectedNodes.length > 0) {
      cut(selectedNodes);
      showToast(`Cut ${selectedNodes.length} item${selectedNodes.length === 1 ? '' : 's'}`, "success");
    } else {
      showToast("No files selected", "destructive");
    }
  };
  
  const pasteFiles = async () => {
    const targetNode = focused ? currentWorkspace.nodeFromPath(focused) : RootNode;
    if (targetNode) {
      try {
        await paste(targetNode);
        showToast("Files pasted", "success");
      } catch (error) {
        showToast("Paste failed", "destructive");
      }
    } else {
      showToast("No target selected", "destructive");
    }
  };

  const { storedValue: width } = useLeftWidth();
  const { zoomLevel } = useZoom();
  
  // Use a slightly more generous threshold to avoid the loop issue
  const isTooSmall = Boolean(width * (1.05 / zoomLevel) < 340);

  if (isTooSmall) {
    return (
      <TooltipToast cmdRef={toastRef} durationMs={2000}>
        <FileMenuCompactActions
          trashSelectedFiles={trashSelectedFiles}
          addFile={addFile}
          addDir={addDir}
          addCssFile={addCssFile}
          setExpandAll={setExpandAll}
          diskType={diskType}
          copyFiles={copyFiles}
          cutFiles={cutFiles}
          pasteFiles={pasteFiles}
        />
      </TooltipToast>
    );
  }

  return (
    <TooltipToast cmdRef={toastRef} durationMs={2000}>
      <FileMenuActionButtonRow
        trashSelectedFiles={trashSelectedFiles}
        addFile={addFile}
        addDir={addDir}
        addCssFile={addCssFile}
        setExpandAll={setExpandAll}
        diskType={diskType}
        copyFiles={copyFiles}
        cutFiles={cutFiles}
        pasteFiles={pasteFiles}
      />
    </TooltipToast>
  );
};
