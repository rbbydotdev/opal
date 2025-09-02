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
import { WorkspaceMenu } from "@/components/WorkspaceMenu";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Opal } from "@/lib/Opal";
import { Link } from "@tanstack/react-router";
import React, { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export function EditorSidebar({
  className,
  ...restProps
}: { className?: string } & React.ComponentProps<typeof Sidebar>) {
  const { currentWorkspace } = useWorkspaceContext();
  const [workspaceTitleMode, setWorkspaceTitleMode] = useState<"display" | "edit">("display");
  const fnRef = useRef<null | (() => void)>(null);
  const deferredFn = (fn: () => void) => {
    return () => (fnRef.current = fn);
  };

  return (
    <Sidebar collapsible="none" className={twMerge("flex min-h-full w-full", className)} {...restProps}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <WorkspaceMenu
              workspaceName={currentWorkspace.name}
              workspaceGuid={currentWorkspace.guid}
              onRename={deferredFn(() => setWorkspaceTitleMode("edit"))}
              onCloseAutoFocus={(event) => {
                if (fnRef.current) {
                  event.preventDefault();
                  fnRef.current();
                  fnRef.current = null;
                }
              }}
            >
              <SidebarMenuButton className="pr-0" size="lg" asChild>
                <Link
                  to="/workspace/$workspaceName"
                  params={{ workspaceName: currentWorkspace.name }}
                  className="flex items-center w-full"
                >
                  <div className="flex items-center gap-2 border-2 border-secondary-foreground rounded p-2 shadow-md w-full">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
                      <CurrentWorkspaceIcon size={4} scale={7} />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none truncate w-full">
                      {workspaceTitleMode === "edit" ? (
                        <input
                          autoFocus
                          ref={(ref) => ref?.select()}
                          type="text"
                          tabIndex={0}
                          defaultValue={currentWorkspace.name}
                          // onChange={(e) => currentWorkspace.rename(e.target.value)}
                          onBlur={() => setWorkspaceTitleMode("display")}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              (e.target as HTMLInputElement).blur();
                            }
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                              console.log("renaming to", (e.target as HTMLInputElement).value);
                              // return currentWorkspace.rename(e.target.value);
                            }
                          }}
                          className="uppercase w-full bg-transparent outline-none _border-0 border-2 border-green-600 p-0 m-0 font-mono truncate"
                        />
                      ) : (
                        <div className="whitespace-nowrap w-full truncate uppercase font-mono">
                          {currentWorkspace.name}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </SidebarMenuButton>
            </WorkspaceMenu>
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
