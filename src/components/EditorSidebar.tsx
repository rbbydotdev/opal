"use client";
import { SidebarFileMenu } from "@/components/SidebarFileMenu";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import React from "react";
import { twMerge } from "tailwind-merge";
export function EditorSidebar({
  className,
  ...restProps
}: { className?: string } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="none" className={twMerge("flex h-full", className)} {...restProps}>
      <SidebarContent className="overflow-hidden h-full flex-shrink">
        <SidebarFileMenu />
      </SidebarContent>
    </Sidebar>
  );
}
