"use client";
import { SidebarFileMenu } from "@/components/SidebarFileMenu";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { FileTreeJType } from "@/shapes/filetree";
import React from "react";
import { twMerge } from "tailwind-merge";
export function EditorSidebar({
  className,
  fileTree,
  ...restProps
}: { className?: string; fileTree: FileTreeJType } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="none" className={twMerge("flex h-full", className)} {...restProps}>
      <SidebarContent className="overflow-hidden h-full flex-shrink">
        <SidebarFileMenu fileTreeJson={fileTree} className="" />
      </SidebarContent>
    </Sidebar>
  );
}
