import { FileItemContextMenuComponentType } from "@/components/filetree/FileItemContextMenuComponentType";
import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuCtxProvider";
import { ROOT_NODE } from "@/components/filetree/TreeNode";
import { RepoInfoProvider } from "@/components/sidebar/file-menu/FileTreeRepoProvider";
import { useFileTreeClipboardEventListeners } from "@/components/sidebar/hooks/useFileTreeClipboardEventListeners";
import { RootFileMenuBanner } from "@/components/sidebar/main-files-section/RootFileMenuBanner";
import { useFlashTooltip } from "@/components/sidebar/main-files-section/useFlashTooltip";
import { SidebarFileMenuFiles } from "@/components/sidebar/shared/SidebarFileMenuFiles";
import { StockFilesMenu } from "@/components/sidebar/shared/StockFilesMenu";
import { TinyNotice } from "@/components/sidebar/trash-section/TinyNotice";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/tooltip-toast";
import { useFiletreeMenuContextMenuActions } from "@/components/useFiletreeMenuContextMenuActions";
import { useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { getDiskTypeLabel } from "@/data/disk/DiskType";
import { SpecialDirs } from "@/data/SpecialDirs";
import { useLeftWidth } from "@/features/live-preview/EditorSidebarLayout";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useZoom } from "@/hooks/useZoom";
import { DefaultFile } from "@/lib/DefaultFile";
import { Workspace } from "@/lib/events/Workspace";
import { absPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useWorkspaceFileMgmt } from "@/workspace/useWorkspaceFileMgmt";
import {
  ClipboardCopy,
  ClipboardPasteIcon,
  CopyMinus,
  Ellipsis,
  FileCode2Icon,
  FileEditIcon,
  FileTextIcon,
  FolderPlus,
  Globe,
  Info,
  Scissors,
  Trash2,
} from "lucide-react";
import { ComponentProps, useMemo, useRef } from "react";

export function MainSidebarFileMenuFileSection({
  className,
  ItemContextMenu,
}: {
  className?: string;
  ItemContextMenu: FileItemContextMenuComponentType;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { trashSelectedFiles, addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { setExpandAll, expandForNode } = useTreeExpanderContext();

  const { fileTreeDir } = useFileTree();

  useFileTreeClipboardEventListeners({ currentWorkspace, elementSelector: "[data-sidebar-file-menu]" });

  const diskType = useMemo(() => getDiskTypeLabel(currentWorkspace.getDisk().type), [currentWorkspace]);

  return (
    <>
      <RepoInfoProvider currentWorkspace={currentWorkspace}>
        <SidebarFileMenuFiles
          data-main-sidebar
          // FileItemContextMenu={MainFileTreeContextMenu} // <MainFileTreeContextMenu ...
          menuTitle={"Files"}
          ItemContextMenu={ItemContextMenu}
          className={className}
          contentBanner={!fileTreeDir.isEmpty() ? <RootFileMenuBanner currentWorkspace={currentWorkspace} /> : null}
          filter={SpecialDirs.All} // Exclude trash and git directories etc
        >
          <span className="block group-data-[state=closed]/collapsible:hidden">
            <SidebarFileMenuFilesActions
              trashSelectedFiles={trashSelectedFiles}
              addFile={() => expandForNode(addDirFile("file", focused || absPath("/")), true)}
              addCssFile={() => expandForNode(addDirFile("file", focused || absPath("/"), "styles.css"), true)}
              addGlobalCssFile={() =>
                expandForNode(addDirFile("file", focused || absPath("/"), "global.css", DefaultFile.GlobalCSS()), true)
              }
              addHtmlFile={() =>
                expandForNode(addDirFile("file", focused || absPath("/"), "index.html", DefaultFile.HTML()), true)
              }
              addMustacheFile={() =>
                expandForNode(
                  addDirFile("file", focused || absPath("/"), "template.mustache", DefaultFile.Mustache()),
                  true
                )
              }
              addEjsFile={() =>
                expandForNode(addDirFile("file", focused || absPath("/"), "template.ejs", DefaultFile.EJS()), true)
              }
              addDir={() => expandForNode(addDirFile("dir", focused || absPath("/")), true)}
              setExpandAll={setExpandAll}
              diskType={diskType}
              dirName={currentWorkspace.getDisk().dirName}
              currentWorkspace={currentWorkspace}
            />
          </span>
          {!fileTreeDir.isEmpty() && <TinyNotice />}
        </SidebarFileMenuFiles>
      </RepoInfoProvider>
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

const DirNameLabel = ({ dirName }: { dirName: string | null }) => {
  return (
    <span className="whitespace-nowrap inline-block max-w-[12ch] overflow-hidden text-ellipsis align-middle font-bold">
      {dirName ? `: ${dirName}` : ""}
    </span>
  );
};
const FileMenuActionButtonRow = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  addMustacheFile,
  addEjsFile,
  // addGlobalCssFile,
  setExpandAll,
  diskType,
  dirName,
  copyFiles,
  cutFiles,
  pasteFiles,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void;
  // addGlobalCssFile?: () => void;
  addHtmlFile?: () => void;
  addMustacheFile?: () => void;
  addEjsFile?: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
  dirName: string | null;
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
        <TooltipContent>
          {diskType}
          <DirNameLabel dirName={dirName} />
        </TooltipContent>
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
      <ActionButton onClick={addMustacheFile} aria-label="New Mustache Template" title="New Mustache Template">
        <FileTextIcon />
      </ActionButton>
      <ActionButton onClick={addFile} aria-label="New Markdown File" title="New Markdown File">
        <FileEditIcon />
      </ActionButton>
      <ActionButton onClick={addCssFile} aria-label="New Css File" title="New Css File">
        <FileCode2Icon />
      </ActionButton>
      <ActionButton onClick={addEjsFile} aria-label="New EJS Template" title="New EJS Template">
        <FileTextIcon />
      </ActionButton>
      <ActionButton onClick={addDir} aria-label="Add Folder" title="New Folder">
        <FolderPlus />
      </ActionButton>
      <StockFilesMenu variant="icon" />
      <ActionButton
        title="Collapse All / Double click to Expand All"
        aria-label="Collapse All / Double click to Expand All"
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
  addMustacheFile,
  addEjsFile,
  addGlobalCssFile,
  addHtmlFile,
  setExpandAll,
  diskType,
  dirName,
  copyFiles,
  cutFiles,
  pasteFiles,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile: () => void;
  addGlobalCssFile: () => void;
  addHtmlFile: () => void;
  addMustacheFile: () => void;
  addEjsFile: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
  dirName: string | null;
  copyFiles: () => void;
  cutFiles: () => void;
  pasteFiles: () => void;
}) => {
  const deferredFn = useRef<null | (() => void)>(null);
  const deferFn = (fn: () => void) => {
    return () => (deferredFn.current = fn);
  };
  return (
    <div className="flex items-center justify-center p-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="p-1 m-0 !bg-transparent h-auto"
            variant="ghost"
            aria-label="File Menu Actions"
            title="File Menu Actions"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(e) => {
            if (deferredFn.current) {
              e.preventDefault();
              deferredFn.current();
              deferredFn.current = null;
            }
          }}
        >
          <DropdownMenuItem className="whitespace-nowrap" onClick={addMustacheFile}>
            <FileTextIcon className="w-4 h-4 mr-2" />
            New Mustache Template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={deferFn(addFile)}>
            <FileEditIcon className="w-4 h-4 mr-2" />
            New Markdown File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={deferFn(addCssFile)}>
            <FileCode2Icon className="w-4 h-4 mr-2" />
            New CSS File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={deferFn(addEjsFile)}>
            <FileTextIcon className="w-4 h-4 mr-2" />
            New EJS Template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={deferFn(addDir)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileCode2Icon className="w-4 h-4 mr-2" />
              Stock Files
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={deferFn(addGlobalCssFile)}>
                <FileCode2Icon className="w-4 h-4 mr-2" />
                global.css
              </DropdownMenuItem>
              <DropdownMenuItem onClick={deferFn(addHtmlFile)}>
                <Globe className="w-4 h-4 mr-2" />
                index.html
              </DropdownMenuItem>
              <DropdownMenuItem onClick={deferFn(addMustacheFile)}>
                <FileTextIcon className="w-4 h-4 mr-2" />
                template.mustache
              </DropdownMenuItem>
              <DropdownMenuItem onClick={deferFn(addEjsFile)}>
                <FileTextIcon className="w-4 h-4 mr-2" />
                template.ejs
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
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

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={trashSelectedFiles}>
            <Trash2 className="w-4 h-4 mr-2" />
            Trash Files
          </DropdownMenuItem>

          <DropdownMenuSeparator />
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
            <DirNameLabel dirName={dirName} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const SidebarFileMenuFilesActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  addMustacheFile,
  addEjsFile,
  addGlobalCssFile,
  addHtmlFile,
  setExpandAll,
  diskType,
  dirName,
  currentWorkspace,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile: () => void;
  addGlobalCssFile: () => void;
  addHtmlFile: () => void;
  addMustacheFile: () => void;
  addEjsFile: () => void;
  addDir: () => void;
  dirName: string | null;
  setExpandAll: (expand: boolean) => void;
  diskType: string;
  currentWorkspace: Workspace;
}) => {
  const { copy, cut, paste } = useFiletreeMenuContextMenuActions({ currentWorkspace });
  const { selectedFocused, focused } = useFileTreeMenuCtx();
  const { show: showToast, cmdRef: toastRef } = useTooltipToastCmd();

  const copyFiles = async () => {
    const selectedNodes = currentWorkspace.nodesFromPaths(selectedFocused);
    if (selectedNodes.length > 0) {
      await copy(selectedNodes);
      showToast(`Copied ${selectedNodes.length} item${selectedNodes.length === 1 ? "" : "s"}`, "success");
    } else {
      showToast("No files selected", "destructive");
    }
  };

  const cutFiles = async () => {
    const selectedNodes = currentWorkspace.nodesFromPaths(selectedFocused);
    if (selectedNodes.length > 0) {
      await cut(selectedNodes);
      showToast(`Cut ${selectedNodes.length} item${selectedNodes.length === 1 ? "" : "s"}`, "success");
    } else {
      showToast("No files selected", "destructive");
    }
  };

  const pasteFiles = async () => {
    const targetNode = focused ? currentWorkspace.nodeFromPath(focused) : ROOT_NODE;
    if (targetNode) {
      try {
        await paste(targetNode);
        showToast("Files pasted", "success");
      } catch (_err) {
        showToast("Paste failed", "destructive");
      }
    } else {
      showToast("No target selected", "destructive");
    }
  };

  const { storedValue: width } = useLeftWidth();
  const { zoomLevel } = useZoom();

  // Use a slightly more generous threshold to avoid the loop issue
  const isTooSmall = Boolean(width * (0.9 / zoomLevel) < 410);

  if (isTooSmall) {
    return (
      <TooltipToast cmdRef={toastRef} durationMs={2000}>
        <FileMenuCompactActions
          trashSelectedFiles={trashSelectedFiles}
          addFile={addFile}
          addDir={addDir}
          addCssFile={addCssFile}
          addMustacheFile={addMustacheFile}
          dirName={dirName}
          addEjsFile={addEjsFile}
          addGlobalCssFile={addGlobalCssFile}
          addHtmlFile={addHtmlFile}
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
        addMustacheFile={addMustacheFile}
        dirName={dirName}
        addEjsFile={addEjsFile}
        // addGlobalCssFile={addGlobalCssFile}
        setExpandAll={setExpandAll}
        diskType={diskType}
        copyFiles={copyFiles}
        cutFiles={cutFiles}
        pasteFiles={pasteFiles}
      />
    </TooltipToast>
  );
};
