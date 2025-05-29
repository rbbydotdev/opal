"use client";
import { EditorSidebar } from "@/components/EditorSidebar";
import { FileTreeMenuContextProvider } from "@/components/FileTreeContext";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import React, { useCallback, useEffect, useRef } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";

export default function Layout({ children }: { children: React.ReactNode }) {
  const ref = useRef<ImperativePanelHandle>(null);
  const panel = ref.current;
  const toggleCollapsePanel = useCallback(() => {
    if (panel?.isExpanded()) {
      panel.collapse();
    } else if (panel?.isCollapsed()) {
      panel.expand();
    }
  }, [panel]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        e.stopPropagation();
        toggleCollapsePanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleCollapsePanel]);
  return (
    <ServiceWorker>
      <FileTreeMenuContextProvider>
        <Toaster />
        <div className="w-full flex flex-col h-screen">
          {/* <div className="w-full h-[32px] flex-shrink-0 flex justify-start pl-2 items-center bg-secondary-foreground text-white font-mono uppercase truncate overflow-hidden whitespace-nowrap ">
            <WorkspaceStatus />
          </div> */}
          {/* <div className="h-[calc(100vh-32px)] flex"> */}
          <div className="h-full flex">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel ref={ref} id="editorSideBar" defaultSize={20} minSize={20} collapsible={true}>
                <EditorSidebar style={{ "--sidebar-width": "100%" } as React.CSSProperties} collapsible="none" />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel id="editor" defaultSize={85}>
                {children}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </FileTreeMenuContextProvider>
    </ServiceWorker>
  );
}
