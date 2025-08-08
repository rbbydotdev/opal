"use client";

import { SidebarFileMenuExport } from "@/components/SidebarFileMenu/export-section/SidebarFileMenuExport";
import { MainSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/main-files-section/MainSidebarFileMenuFileSection";
import { SidebarFileMenuPublish } from "@/components/SidebarFileMenu/publish-section/SidebarFileMenuPublish";
import { SidebarConnectionsSection } from "@/components/SidebarFileMenu/SidebarConnectionsSections";
import { SidebarGitSection } from "@/components/SidebarFileMenu/sync-section/SidebarFileMenuSync";
import { TrashSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/trash-section/TrashSidebarFileMenuFileSection";
import { SidebarMenuTreeSection } from "@/components/SidebarFileMenu/tree-view-section/SidebarMenuTreeSection";
import { SidebarFileMenuUpload } from "@/components/SidebarFileMenu/upload-section/SidebarFileMenuUpload";
import { DisplayTreeProvider, useEditorDisplayTreeCtx } from "@/components/useEditorDisplayTree";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { IS_MAC } from "@/lib/isMac";
import { Slot } from "@radix-ui/react-slot";
import { Ellipsis, List, ListXIcon } from "lucide-react";
import React, { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { useWorkspaceContext } from "../../context/WorkspaceHooks";
import { handleDropFilesEventForNode } from "../../features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeExpanderProvider } from "../../features/tree-expander/TreeExpanderContext";
import useLocalStorage2 from "../../hooks/useLocalStorage2";
import { capitalizeFirst } from "../../lib/capitalizeFirst";
import { filterOutAncestor } from "../../lib/paths2";
import { FileTreeMenuCtxProvider } from "../FileTreeMenuCtxProvider";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { SidebarGroup, SidebarGroupAction, SidebarGroupLabel } from "../ui/sidebar";
import { SidebarDndList } from "../ui/SidebarDndList";

function DndSlot({ children, dndId, ...rest }: { children: React.ReactNode; dndId: DndSectionType }) {
  return <Slot {...rest}>{children}</Slot>;
}
const dndSections = ["publish", "git", "export", "trash", "files", "treeview", "upload", "connections"];
type DndSectionType = "publish" | "git" | "export" | "trash" | "files" | "treeview" | "upload" | "connections";

export function SidebarMenuSections({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { currentWorkspace } = useWorkspaceContext();
  // const handleExternalDropEvent = handleDropFilesEventForNode({ currentWorkspace });
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

  const filterAllSpecialDirs = useMemo(() => filterOutAncestor(SpecialDirs.All), []);
  const filterAllSpecialDirsExceptTrash = useMemo(
    () => filterOutAncestor(SpecialDirs.allSpecialDirsExcept(SpecialDirs.Trash)),
    []
  );
  // filterOutAncestor(SpecialDirs.allSpecialDirsExcept(SpecialDirs.Trash))
  //todo do not need this
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
              <span className="text-xs">{capitalizeFirst(id)}</span>
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
            <SidebarGroupAction className="mr-2 -mt-2">
              <Ellipsis />
            </SidebarGroupAction>
          </DropdownMenuTrigger>
        </SidebarGroupLabel>
      </DropdownMenu>
      <div className="overflow-y-auto scrollbar-thin pr-4">
        <SidebarDndList storageKey={"sidebarMenu"} show={storedValue}>
          <DndSlot dndId={"publish"}>
            <SidebarFileMenuPublish className="flex-shrink flex" />
          </DndSlot>
          <DndSlot dndId={"git"}>
            <SidebarGitSection className="flex-shrink flex flex-col" />
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
                <TreeMenuSection id="TreeView" />
              </DisplayTreeProvider>
            </div>
          </DndSlot>

          <DndSlot dndId={"trash"}>
            <div className="min-h-8 flex-shrink flex">
              <FileTreeMenuCtxProvider
                currentWorkspace={currentWorkspace}
                filterRange={filterAllSpecialDirsExceptTrash}
              >
                <TrashSidebarFileMenuFileSection />
              </FileTreeMenuCtxProvider>
            </div>
          </DndSlot>

          <DndSlot dndId={"upload"}>
            <div className="flex-shrink flex">
              <FileTreeMenuCtxProvider currentWorkspace={currentWorkspace}>
                <SidebarFileMenuUpload />
              </FileTreeMenuCtxProvider>
            </div>
          </DndSlot>

          <DndSlot dndId={"files"}>
            <div className="flex-shrink flex">
              <FileTreeMenuCtxProvider currentWorkspace={currentWorkspace} filterRange={filterAllSpecialDirs}>
                <TreeExpanderProvider id="MainFiles" nodePaths={[]}>
                  <MainSidebarFileMenuFileSection />
                </TreeExpanderProvider>
              </FileTreeMenuCtxProvider>
            </div>
          </DndSlot>
        </SidebarDndList>
      </div>
    </SidebarGroup>
  );
}

function TreeMenuSection({ id }: { id: string }) {
  const { flatTree } = useEditorDisplayTreeCtx();
  return (
    <TreeExpanderProvider nodePaths={flatTree} id={id}>
      <SidebarMenuTreeSection />
    </TreeExpanderProvider>
  );
}
