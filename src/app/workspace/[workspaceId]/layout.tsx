"use client";
import { WorkspaceStatus } from "@/app/workspace/[workspaceId]/WorkspaceStatus";
import { EditorSidebar } from "@/components/EditorSidebar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import React, { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  /*
    
  */
  const [value, setValue] = useState(20);
  return (
    <div className="w-full flex flex-col">
      <div className="w-full h-8 flex-shrink-0 flex justify-start pl-2 items-center bg-slate-900 text-white font-mono uppercase">
        <WorkspaceStatus />
      </div>
      {/* <input value={value} onChange={(e) => setValue(Number(e.target.value))}></input> */}
      <div className="w-full flex flex-grow">
        <ResizablePanelGroup direction="horizontal">
          {/* <ResizablePanelGroup direction="horizontal" autoSaveId={"editorSideBar/editor"}> */}
          <ResizablePanel id="editorSideBar" defaultSize={value} minSize={value} collapsible={true}>
            <EditorSidebar
              className="h-[calc(100vh-20px)]"
              style={{ "--sidebar-width": "100%" } as React.CSSProperties}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="editor" defaultSize={100}>
            {/* <div className="overflow-hidden min-w-full w-0">{children}</div> */}
            <div className="w-full h-full">{children}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
