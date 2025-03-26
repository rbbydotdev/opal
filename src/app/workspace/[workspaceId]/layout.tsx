"use client";
import { WorkspaceStatus } from "@/app/workspace/[workspaceId]/WorkspaceStatus";
import { EditorSidebar } from "@/components/EditorSidebar";
import { FileTreeMenuContextProvider } from "@/components/FileTreeContext";
import { WorkerContextProvider } from "@/components/SWImages";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FileTreeMenuContextProvider>
      <div className="w-full flex flex-col">
        <div className="w-full h-8 flex-shrink-0 flex justify-start pl-2 items-center bg-secondary-foreground text-white font-mono uppercase">
          <WorkspaceStatus />
        </div>
        <div className="h-full flex">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel id="editorSideBar" defaultSize={15} minSize={7} collapsible={true}>
              <EditorSidebar
                // className="h-[calc(100vh-20px)]"
                // className="inset-0 absolute "
                style={{ "--sidebar-width": "100%" } as React.CSSProperties}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="editor" defaultSize={85}>
              <div className="w-full h-full bg-secondary">
                <WorkerContextProvider>
                  <div>{children}</div>
                </WorkerContextProvider>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </FileTreeMenuContextProvider>
  );
}
