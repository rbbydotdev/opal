import { SidebarFileMenu } from "@/components/SidebarFileMenu";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { FileTreeJType } from "@/lib/files";
import React from "react";
import { twMerge } from "tailwind-merge";
export function EditorSidebar({
  className,
  fileTree,
  ...restProps
}: { className?: string; fileTree: FileTreeJType } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="none" className={twMerge("h-screen", className)} {...restProps}>
      <SidebarContent>
        <SidebarFileMenu fileTreeJson={fileTree} />
      </SidebarContent>
    </Sidebar>
  );
}
