import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ErrorMiniPlaque } from "@/components/errors/ErrorPlaque";
import { FileTreeMenuCtxProvider } from "@/components/filetree/FileTreeMenuContext";
// import { BuildSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/build-files-section/BuildSidebarFileMenuFileSection";
import { FileTreeProvider } from "@/components/filetree/FileTreeContext";
import { ROOT_NODE } from "@/components/filetree/TreeNode";
import { SidebarFileMenuBuild } from "@/components/sidebar/build-section/SidebarFileMenuBuild";
import { SidebarFileMenuExport } from "@/components/sidebar/export-section/SidebarFileMenuExport";
import { MainFileTreeContextMenu } from "@/components/sidebar/file-menu/MainFileTreeContextMenu";
import { MainSidebarFileMenuFileSection } from "@/components/sidebar/main-files-section/MainSidebarFileMenuFileSection";
import { SidebarConnectionsSection } from "@/components/sidebar/SidebarConnectionsSections";
import { SidebarDndList } from "@/components/sidebar/SidebarDndList";
import { SidebarGitSection } from "@/components/sidebar/sync-section/SidebarGitSection";
import { TrashSidebarFileMenuFileSection } from "@/components/sidebar/trash-section/TrashSidebarFileMenuFileSection";
import { SidebarMenuTreeSection } from "@/components/sidebar/tree-view-section/SidebarMenuTreeSection";
import { SidebarFileMenuUpload } from "@/components/sidebar/upload-section/SidebarFileMenuUpload";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarGroup, SidebarGroupAction, SidebarGroupLabel } from "@/components/ui/sidebar";
import { FilterInSpecialDirs } from "@/data/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { useDoubleCmdFocus } from "@/hooks/useDoubleCmdFocus";
import { handleDropFilesEventForNode } from "@/hooks/useFileTreeDragDrop";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { IS_MAC } from "@/lib/isMac";
import { Workspace } from "@/workspace/Workspace";
import { Slot } from "@radix-ui/react-slot";
import { List, ListXIcon } from "lucide-react";
import React from "react";
import { twMerge } from "tailwind-merge";
import { useWorkspaceContext } from "../../workspace/WorkspaceContext";
import { DisplayTreeProvider } from "./tree-view-section/DisplayTreeContext";

function DndSlot({ children, dndId, ...rest }: { children: React.ReactNode; dndId: DndSectionType }) {
  return (
    <ErrorBoundary fallback={ErrorMiniPlaque}>
      <Slot {...rest} data-section-name={dndId}>
        {children}
      </Slot>
    </ErrorBoundary>
  );
}
const dndSections = [
  "build",
  "git",
  "export",
  "trash",
  "files",
  "treeview",
  "upload",
  "connections" /*, "build_files"*/,
];
type DndSectionType = "build" | "git" | "export" | "trash" | "files" | "treeview" | "upload" | "connections";
// | "build_files";

export function SidebarMenuSections({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { currentWorkspace } = useWorkspaceContext();
  const { setStoredValue, storedValue, defaultValues } = useLocalStorage(
    "SidebarFileMenu/Dnd",
    dndSections as DndSectionType[]
  );
  const sidebarListRef = useDoubleCmdFocus();

  const setDnds = (ids: DndSectionType[]) => {
    setStoredValue(ids);
  };
  const toggleDnd = (id: DndSectionType) => {
    if (storedValue.includes(id)) {
      setStoredValue(storedValue.filter((v) => v !== id));
    } else {
      setStoredValue([...storedValue, id]);
    }
  };

  return (
    <SidebarGroup
      {...props}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(event) =>
        handleDropFilesEventForNode({
          currentWorkspace,
          event,
          targetNode: ROOT_NODE,
        })
      }
      className={twMerge("p-0 bg-sidebar sidebar-group h-full", props.className)}
    >
      <DropdownMenu>
        <DropdownMenuContent>
          {defaultValues.map((id) => (
            <DropdownMenuCheckboxItem
              key={id}
              className="flex gap-2 py-2"
              checked={storedValue.includes(id)}
              onClick={(e) => {
                if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault();
                toggleDnd(id);
              }}
            >
              <span className="text-xs">{id.split("_").map(capitalizeFirst).join(" ")}</span>
            </DropdownMenuCheckboxItem>
          ))}
          <Separator />
          <DropdownMenuItem
            className="text-xs flex justify-start py-2"
            onClick={(e) => {
              if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault();
              setDnds([...defaultValues]);
            }}
          >
            <List />
            Show All
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-xs flex justify-start py-2"
            onClick={(e) => {
              if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault();
              setDnds([]);
            }}
          >
            <ListXIcon />
            Hide All
          </DropdownMenuItem>
          <Separator />
          <DropdownMenuLabel className="py-2 text-2xs w-full text-muted-foreground font-thin">
            {IS_MAC ? "⌘ cmd" : "ctrl"} + click / multi-select
          </DropdownMenuLabel>
        </DropdownMenuContent>
        <SidebarGroupLabel className="h-6">
          <DropdownMenuTrigger asChild>
            <SidebarGroupAction className="mr-2 -mt-2" title="Sidebar Menu">
              <List />
              <span className="sr-only">Sidebar Menu</span>
            </SidebarGroupAction>
          </DropdownMenuTrigger>
        </SidebarGroupLabel>
      </DropdownMenu>
      <div
        ref={sidebarListRef}
        className="space-y-1 p-1 sidebar-menu-section-list overflow-y-auto no-scrollbar"
        tabIndex={-1}
      >
        <SidebarMenuDndList show={storedValue} currentWorkspace={currentWorkspace} />
      </div>
    </SidebarGroup>
  );
}
function SidebarMenuDndList({ show, currentWorkspace }: { show: DndSectionType[]; currentWorkspace: Workspace }) {
  return (
    <SidebarDndList storageKey={"sidebarMenu"} show={show} dragHandle="[data-sidebar='menu-button']">
      <DndSlot dndId={"build"}>
        <SidebarFileMenuBuild className="flex-shrink flex" currentWorkspace={currentWorkspace} />
      </DndSlot>
      <DndSlot dndId={"git"}>
        <SidebarGitSection currentWorkspace={currentWorkspace} className="flex-shrink flex flex-col" />
      </DndSlot>
      <DndSlot dndId={"connections"}>
        <SidebarConnectionsSection className="flex-shrink flex flex-col" />
      </DndSlot>
      <DndSlot dndId={"export"}>
        <SidebarFileMenuExport className="flex-shrink flex" />
      </DndSlot>
      <DndSlot dndId={"treeview"}>
        <div className="flex-shrink flex min-h-8">
          <DisplayTreeProvider>
            <TreeExpanderProvider id="TreeView">
              <SidebarMenuTreeSection />
            </TreeExpanderProvider>
          </DisplayTreeProvider>
        </div>
      </DndSlot>

      <DndSlot dndId={"trash"}>
        <div className="min-h-8 flex-shrink flex">
          <FileTreeMenuCtxProvider>
            <TrashSidebarFileMenuFileSection />
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>

      <DndSlot dndId={"upload"}>
        <div className="flex-shrink flex">
          <FileTreeMenuCtxProvider>
            <SidebarFileMenuUpload />
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>

      <DndSlot dndId={"files"}>
        <div className="flex-shrink flex">
          <FileTreeMenuCtxProvider>
            <TreeExpanderProvider id="MainFiles" defaultExpanded={true}>
              <FileTreeProvider filterOut={FilterInSpecialDirs}>
                <MainSidebarFileMenuFileSection ItemContextMenu={MainFileTreeContextMenu} />
              </FileTreeProvider>
            </TreeExpanderProvider>
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>
    </SidebarDndList>
  );
}
