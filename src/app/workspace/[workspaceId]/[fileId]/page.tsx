import { Navbar } from "@/app/Navbar";
import { Editor } from "@/components/Editor/Editor";
import { EditorSidebar } from "@/components/EditorSidebar";
import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function Page() {
  return (
    <div className="w-full">
      <ResizablePanelGroup direction="horizontal" autoSaveId={"1"}>
        <ResizablePanel>
          <EditorSidebar style={{ "--sidebar-width": "100%" } as React.CSSProperties} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <Navbar className="hidden">
            <ModeToggle />
            <Button variant={"outline"}>Button</Button>
          </Navbar>
          <div className="overflow-auto min-w-full w-0 ">
            <Editor
              markdown={""}
              className="flex flex-col"
              contentEditableClassName="max-w-full overflow-auto content-editable prose"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
