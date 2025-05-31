"use client";
import { SidebarFileMenu } from "@/components/SidebarFileMenu/SidebarFileMenu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CurrentWorkspaceIcon } from "@/components/WorkspaceIcon";
import { useWorkspaceContext } from "@/context";
import React from "react";
import { twMerge } from "tailwind-merge";
export function EditorSidebar({
  className,
  ...restProps
}: { className?: string } & React.ComponentProps<typeof Sidebar>) {
  const { currentWorkspace } = useWorkspaceContext();
  return (
    <Sidebar collapsible="none" className={twMerge("flex min-h-full w-full", className)} {...restProps}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" size="lg" asChild>
              <div className="flex items-center gap-2 border-2 border-secondary-foreground rounded-md p-2 shadow-md">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
                  <CurrentWorkspaceIcon size={4} scale={7} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none truncate">
                  <div className="whitespace-nowrap w-full truncate uppercase font-thin font-mono">
                    {currentWorkspace.name}
                  </div>
                  {/* <span className="text-xs">Virtual Filesystem</span> */}
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-hidden h-full flex-shrink">
        <SidebarFileMenu />
      </SidebarContent>

      <SidebarFooter>Foo</SidebarFooter>
    </Sidebar>
  );
}
