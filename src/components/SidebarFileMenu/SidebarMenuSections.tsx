"use client";

import { SidebarFileMenuExport } from "@/components/SidebarFileMenu/export-section/SidebarFileMenuExport";
import { MainSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/files-section/MainSidebarFileMenuFileSection";
import { SidebarFileMenuPublish } from "@/components/SidebarFileMenu/publish-section/SidebarFileMenuPublish";
import { SidebarFileMenuSync } from "@/components/SidebarFileMenu/sync-section/SidebarFileMenuSync";
import { TrashSidebarFileMenuFileSection } from "@/components/SidebarFileMenu/trash-section/TrashSidebarFileMenuFileSection";
import { Ellipsis, List, ListXIcon } from "lucide-react";
import React from "react";
import { twMerge } from "tailwind-merge";
import { useWorkspaceContext } from "../../context/WorkspaceHooks";
import { useHandleDropFilesEventForNode } from "../../features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeExpanderProvider } from "../../features/tree-expander/TreeExpanderContext";
import useLocalStorage2 from "../../hooks/useLocalStorage2";
import { capitalizeFirst } from "../../lib/capitalizeFirst";
import { TreeNode } from "../../lib/FileTree/TreeNode";
import { absPath } from "../../lib/paths2";
import { FileTreeMenuCtxProvider } from "../FileTreeMenuCtxProvider";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel } from "../ui/sidebar";
import { SidebarDndList } from "../ui/SidebarDndList";
import { useDndList } from "./hooks/useDndList";
import { SidebarTreeView, SidebarTreeViewActions } from "./SidebarTreeView";

export function SidebarMenuSections({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { currentWorkspace } = useWorkspaceContext();
  const handleExternalDropEvent = useHandleDropFilesEventForNode({ currentWorkspace });
  const { setValue, storedValue, defaultValues } = useLocalStorage2("SidebarFileMenu/Dnd", [
    "publish",
    "sync",
    "export",
    "trash",
    "files",
    "treeview",
  ] satisfies Array<"publish" | "sync" | "export" | "trash" | "files" | "treeview">);

  const { dnds, setDnds, toggleDnd, dndId } = useDndList(defaultValues, storedValue, setValue);
  return (
    <SidebarGroup
      {...props}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => handleExternalDropEvent(e, TreeNode.FromPath(absPath("/"), "dir"))}
      className={twMerge("p-0 bg-sidebar sidebar-group h-full", props.className)}
    >
      <DropdownMenu>
        <DropdownMenuContent>
          {defaultValues.map((id) => (
            <DropdownMenuCheckboxItem
              key={id}
              className="flex gap-2"
              checked={dnds.includes(id)}
              onCheckedChange={() => toggleDnd(id)}
            >
              <span className="text-xs">{capitalizeFirst(id)}</span>
            </DropdownMenuCheckboxItem>
          ))}
          <Separator />
          <DropdownMenuItem
            className="text-xs flex justify-start"
            onClick={() => {
              setDnds([...defaultValues]);
            }}
          >
            <List />
            Show All
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-xs flex justify-start"
            onClick={() => {
              setDnds([]);
            }}
          >
            <ListXIcon />
            Hide All
          </DropdownMenuItem>
        </DropdownMenuContent>
        <SidebarGroupLabel className=" h-6">
          <DropdownMenuTrigger asChild>
            <SidebarGroupAction className="mr-2 -mt-2">
              <Ellipsis />
            </SidebarGroupAction>
          </DropdownMenuTrigger>
        </SidebarGroupLabel>
      </DropdownMenu>
      <div className="overflow-y-auto scrollbar-thin pr-4">
        <SidebarDndList storageKey={"sidebarMenu"} show={Array.from(dnds)}>
          <SidebarFileMenuPublish dnd-id={dndId("publish")} className="flex-shrink flex" />
          <SidebarFileMenuSync dnd-id={dndId("sync")} className="flex-shrink flex flex-col" />
          <SidebarFileMenuExport dnd-id={dndId("export")} className="flex-shrink flex" />
          <div dnd-id={dndId("treeview")} className="flex-shrink flex min-h-8">
            <TreeExpanderProvider id="TreeView">
              <SidebarTreeView className="">
                <SidebarGroupContent className="flex items-center">
                  <SidebarTreeViewActions
                    trashSelectedFiles={function (): void {}}
                    addFile={function (): void {}}
                    addDir={function (): void {}}
                    setExpandAll={function (expand: boolean): void {}}
                  />
                </SidebarGroupContent>
              </SidebarTreeView>
            </TreeExpanderProvider>
          </div>

          <div dnd-id={dndId("trash")} className="min-h-8 flex-shrink flex">
            <FileTreeMenuCtxProvider id="TrashFiles" currentWorkspace={currentWorkspace}>
              <TrashSidebarFileMenuFileSection />
            </FileTreeMenuCtxProvider>
          </div>

          <div className="flex-shrink flex" dnd-id={dndId("files")}>
            <FileTreeMenuCtxProvider id="MainFiles" currentWorkspace={currentWorkspace}>
              <TreeExpanderProvider id="MainFiles">
                <MainSidebarFileMenuFileSection />
              </TreeExpanderProvider>
            </FileTreeMenuCtxProvider>
          </div>
        </SidebarDndList>
      </div>
    </SidebarGroup>
  );
}
