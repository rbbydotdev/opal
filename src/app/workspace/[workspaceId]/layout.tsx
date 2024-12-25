import { EditorSidebar } from "@/components/EditorSidebar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FileTree } from "@/shapes/workspace";
import React from "react";

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
  "/project/a/b/e/w/e/w/x/y/z/file13.md",
]);

export default async function Layout({
  children,
  params: { workspaceId },
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const fileTree = FILE_TREE;
  await new Promise((rs) => setTimeout(rs, 0));

  return (
    <div className="w-full flex flex-col">
      <div className="w-full h-8 flex-shrink-0 flex justify-start pl-2 items-center bg-slate-900 text-white font-mono uppercase">
        {workspaceId}
      </div>
      <div className="w-full flex flex-grow">
        <ResizablePanelGroup direction="horizontal" autoSaveId="editorSideBar/editor">
          <ResizablePanel id="editorSideBar" defaultSize={18} minSize={12} collapsible={true}>
            <EditorSidebar
              className="h-[calc(100vh-20px)]"
              fileTree={fileTree.toJSON()}
              style={{ "--sidebar-width": "100%" } as React.CSSProperties}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="editor">
            <div className="overflow-hidden min-w-full w-0">{children}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

//   let targetSizeRems = 0;
// const PADDING_LEFT = 2;
// const INDENT = 0.5;
//   fileTree.walk((file, depth: number = 0) => {
//     const width = file.name.length + PADDING_LEFT + depth * INDENT;
//     if (width > targetSizeRems) targetSizeRems = width;
//   });
