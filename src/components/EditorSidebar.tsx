import { SidebarMenuSections } from "@/components/SidebarFileMenu/SidebarMenuSections";
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
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Opal } from "@/lib/Opal";
import { Link } from "@tanstack/react-router";
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
            <SidebarMenuButton className="_cursor-pointer" size="lg" asChild>
              <Link
                to="/workspace/$workspaceName"
                params={{ workspaceName: currentWorkspace.name }}
                className="flex items-center w-full"
              >
                <div className="flex items-center gap-2 border-2 border-secondary-foreground rounded p-2 shadow-md w-full">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
                    <CurrentWorkspaceIcon size={4} scale={7} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none truncate">
                    <div className="whitespace-nowrap w-full truncate uppercase font-mono">{currentWorkspace.name}</div>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-clip h-full flex-shrink">
        <SidebarMenuSections />
      </SidebarContent>

      <SidebarFooter className="text-3xs to-sidebar-accent uppercase font-mono w-full flex content-center">
        <div className="w-full flex items-center justify-start gap-1">
          <Opal size={12} />
          opal editor by{" "}
          <a href="https://github.com/rbbydotdev" className="inline hover:text-ring" tabIndex={-1}>
            @rbbydotdev
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
