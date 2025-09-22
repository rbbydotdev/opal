import { useLeftWidth } from "@/app/EditorSidebarLayout";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useFileTreeClipboardEventListeners } from "@/components/SidebarFileMenu/hooks/useFileTreeClipboardEventListeners";
import { useFlashTooltip } from "@/components/SidebarFileMenu/main-files-section/useFlashTooltip";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { absPath } from "@/lib/paths2";
import { useZoom } from "@/lib/useZoom";
import { cn } from "@/lib/utils";
import { CopyMinus, Ellipsis, FileCode2Icon, FileEditIcon, FolderPlus, Info, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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
          />
        </span>
        {!fileTreeDir.isEmpty() && <TinyNotice />}
      </SidebarFileMenuFiles>
    </>
  );
}
const FileMenuActionButtonRow = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  setExpandAll,
  diskType,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
}) => {
  const [open, toggle] = useFlashTooltip();

  return (
    <div className="whitespace-nowrap gap-1 flex items-center justify-center p-1">
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <Button
            onClick={toggle}
            className="p-1 m-0 !bg-transparent"
            variant="ghost"
            aria-label={diskType}
            title={diskType}
          >
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{diskType}</TooltipContent>
      </Tooltip>
      <Button
        onClick={trashSelectedFiles}
        className="p-1 m-0 !bg-transparent"
        variant="ghost"
        aria-label="Trash Files"
        title="Trash Files"
      >
        <Trash2 />
      </Button>
      <Button
        onClick={addFile}
        className="p-1 m-0 !bg-transparent"
        variant="ghost"
        aria-label="New Markdown File"
        title="New Markdown File"
      >
        <FileEditIcon />
      </Button>
      <Button
        onClick={addCssFile}
        className="p-1 m-0 !bg-transparent"
        variant="ghost"
        aria-label="New Css File"
        title="New Css File"
      >
        <FileCode2Icon />
      </Button>
      <Button
        onClick={addDir}
        className="p-1 m-0 !bg-transparent"
        variant="ghost"
        aria-label="Add Folder"
        title="New Folder"
      >
        <FolderPlus />
      </Button>
      <Button
        aria-label="Expand All"
        onDoubleClick={() => setExpandAll(true)}
        onClick={() => setExpandAll(false)}
        className="p-1 m-0 !bg-transparent"
        variant="ghost"
        title="Collapse All"
      >
        <CopyMinus />
      </Button>
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
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
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
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void; // Optional for future use
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
}) => {
  const { storedValue: width } = useLeftWidth();
  const { zoomLevel } = useZoom();
  const isTooSmall = Boolean(width * (1.05 / zoomLevel) < 310);

  if (isTooSmall) {
    return (
      <FileMenuCompactActions
        trashSelectedFiles={trashSelectedFiles}
        addFile={addFile}
        addDir={addDir}
        addCssFile={addCssFile}
        setExpandAll={setExpandAll}
        diskType={diskType}
      />
    );
  }

  return (
    <FileMenuActionButtonRow
      trashSelectedFiles={trashSelectedFiles}
      addFile={addFile}
      addDir={addDir}
      addCssFile={addCssFile}
      setExpandAll={setExpandAll}
      diskType={diskType}
    />
  );
};
