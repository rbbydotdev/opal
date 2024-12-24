import { Navbar } from "@/app/Navbar";
import { EditorSidebar } from "@/components/EditorSidebar";
import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FileTree } from "@/lib/files";

const FILE_TREE = new FileTree([
  "/project/intro/background/file1.md",
  "/project/intro/background/file2.md",
  "/project/intro/overview/file3.md",
  "/project/intro/overview/file4.md",
  "/project/main/chapter1/file5.md",
  "/project/main/chapter1/file6.md",
  "/project/main/chapter2/file7.md",
  "/project/main/chapter2/file8.md",
  "/project/conclusion/summary/file9.md",
  "/project/conclusion/summary/file10.md",
  "/project/conclusion/future_work/file11.md",
  "/project/conclusion/future_work/file12.md",
  "/project/a/b/e/w/x/y/z/a/b/e/w/x/y/z/file13.md",
]);

export default function Layout({ children }: { children: React.ReactNode }) {
  const fileTree = FILE_TREE;
  let max = 12;
  fileTree.walk((file, depth = 0) => {
    const width = file.name.length + depth * 2.25;
    if (width > max) max = width;
  });
  return (
    <div className="w-full">
      <ResizablePanelGroup direction="horizontal" autoSaveId={fileTree.id}>
        <ResizablePanel defaultSize={max}>
          <EditorSidebar fileTree={fileTree.toJSON()} style={{ "--sidebar-width": "100%" } as React.CSSProperties} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <Navbar className="hidden">
            <ModeToggle />
            <Button variant={"outline"}>Button</Button>
          </Navbar>
          <div className="overflow-auto min-w-full w-0 ">{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
