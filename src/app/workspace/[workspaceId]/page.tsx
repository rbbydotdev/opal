"use client";
import { WorkspaceName } from "@/app/workspace/[workspaceId]/WorkspaceName";
import { EditorSidebar } from "@/components/EditorSidebar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import React from "react";

export default function Page() {
  return (
    <div className="w-full flex flex-col">
      <div className="w-full h-8 flex-shrink-0 flex justify-start pl-2 items-center bg-slate-900 text-white font-mono uppercase">
        <WorkspaceName />
      </div>
      <div className="w-full flex flex-grow">
        <ResizablePanelGroup direction="horizontal" autoSaveId="editorSideBar/editor">
          <ResizablePanel id="editorSideBar" defaultSize={18} minSize={12} collapsible={true}>
            <EditorSidebar
              className="h-[calc(100vh-20px)]"
              style={{ "--sidebar-width": "100%" } as React.CSSProperties}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="editor">
            <div className="overflow-hidden min-w-full w-0">FOO BAR BIZZ BAZ</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
