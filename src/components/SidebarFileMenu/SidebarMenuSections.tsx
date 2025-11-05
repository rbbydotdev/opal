import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorMiniPlaque } from "@/components/ErrorPlaque";
import { FileTreeMenuCtxProvider } from "@/components/FileTreeMenuCtxProvider";
import { BuildSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/build-files-section/BuildSidebarFileMenuFileSection";
import { SidebarFileMenuBuild } from "@/components/SidebarFileMenu/build-section/SidebarFileMenuBuild";
import { SidebarFileMenuExport } from "@/components/SidebarFileMenu/export-section/SidebarFileMenuExport";
import { MainSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/main-files-section/MainSidebarFileMenuFileSection";
import { SidebarConnectionsSection } from "@/components/SidebarFileMenu/SidebarConnectionsSections";
import { SidebarGitSection } from "@/components/SidebarFileMenu/sync-section/SidebarGitSection";
import { TrashSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/trash-section/TrashSidebarFileMenuFileSection";
import { SidebarMenuTreeSection } from "@/components/SidebarFileMenu/tree-view-section/SidebarMenuTreeSection";
import { SidebarFileMenuUpload } from "@/components/SidebarFileMenu/upload-section/SidebarFileMenuUpload";
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
import { SidebarDndList } from "@/components/ui/SidebarDndList";
import { DisplayTreeProvider } from "@/components/useEditorDisplayTree";
import { FileTreeProvider, NoopContextMenu } from "@/context/FileTreeProvider";
import { FilterInSpecialDirs } from "@/data/SpecialDirs";
import { Workspace } from "@/data/Workspace";
import { handleDropFilesEventForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { IS_MAC } from "@/lib/isMac";
import { Slot } from "@radix-ui/react-slot";
import { List, ListXIcon } from "lucide-react";
import React from "react";
import { twMerge } from "tailwind-merge";
import { useWorkspaceContext } from "../../context/WorkspaceContext";

function DndSlot({ children, dndId, ...rest }: { children: React.ReactNode; dndId: DndSectionType }) {
  return (
    <ErrorBoundary fallback={ErrorMiniPlaque}>
      <Slot {...rest}>{children}</Slot>
    </ErrorBoundary>
  );
}
const dndSections = ["build", "git", "export", "trash", "files", "treeview", "upload", "connections", "build_files"];
type DndSectionType =
  | "build"
  | "git"
  | "export"
  | "trash"
  | "files"
  | "treeview"
  | "upload"
  | "connections"
  | "build_files";

export function SidebarMenuSections({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { currentWorkspace } = useWorkspaceContext();
  const { setStoredValue, storedValue, defaultValues } = useLocalStorage2(
    "SidebarFileMenu/Dnd",
    dndSections as DndSectionType[]
  );
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
          targetNode: RootNode,
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
      <div className="overflow-y-auto no-scrollbar pr-4">
        <SidebarMenuDndList show={storedValue} currentWorkspace={currentWorkspace} />
      </div>
    </SidebarGroup>
  );
}
function SidebarMenuDndList({ show, currentWorkspace }: { show: DndSectionType[]; currentWorkspace: Workspace }) {
  const nodeFromPath = currentWorkspace.nodeFromPath.bind(currentWorkspace);
  return (
    <SidebarDndList storageKey={"sidebarMenu"} show={show}>
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

      <DndSlot dndId={"build_files"}>
        <div className="flex-shrink flex">
          <FileTreeMenuCtxProvider nodeFromPath={nodeFromPath}>
            <TreeExpanderProvider id="BuildFiles">
              <FileTreeProvider currentWorkspace={currentWorkspace}>
                <BuildSidebarFileMenuFileSection ItemContextMenu={NoopContextMenu} />
              </FileTreeProvider>
            </TreeExpanderProvider>
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>

      <DndSlot dndId={"trash"}>
        <div className="min-h-8 flex-shrink flex">
          <FileTreeMenuCtxProvider nodeFromPath={nodeFromPath}>
            <TrashSidebarFileMenuFileSection />
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>

      <DndSlot dndId={"upload"}>
        <div className="flex-shrink flex">
          <FileTreeMenuCtxProvider nodeFromPath={nodeFromPath}>
            <SidebarFileMenuUpload />
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>

      <DndSlot dndId={"files"}>
        <div className="flex-shrink flex">
          <FileTreeMenuCtxProvider nodeFromPath={nodeFromPath}>
            <TreeExpanderProvider id="MainFiles">
              <FileTreeProvider currentWorkspace={currentWorkspace} filterOut={FilterInSpecialDirs}>
                <MainSidebarFileMenuFileSection ItemContextMenu={MainFileTreeContextMenu} />
              </FileTreeProvider>
            </TreeExpanderProvider>
          </FileTreeMenuCtxProvider>
        </div>
      </DndSlot>
    </SidebarDndList>
  );
}
