"use client";
import { Navbar } from "@/app/Navbar";
import { Editor } from "@/components/Editor/Editor";
import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import dynamic from "next/dynamic";

const AppSidebar = dynamic(() => import("@/components/app-sidebar").then((mod) => mod.AppSidebar), {
  ssr: false,
});

export function Page({ md }: { md: string }) {
  return (
    <div className="w-full h-screen">
      <ResizablePanelGroup direction="horizontal" autoSaveId={"1"}>
        <ResizablePanel>
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <Navbar>
            <ModeToggle />
            <Button variant={"outline"}>Button</Button>
          </Navbar>
          <div className="overflow-auto min-w-full w-0 ">
            <Editor
              markdown={md}
              className="flex flex-col"
              contentEditableClassName="max-w-full overflow-auto content-editable prose"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
