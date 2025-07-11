"use client";
import { EditorSidebarLayout } from "@/app/workspace/[workspaceId]/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { Toaster } from "@/components/ui/toaster";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import { rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { DROP_COMMAND } from "lexical";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  // const { currentWorkspace } = useWorkspaceContext();
  // const handleExternalDropEvent = useHandleDropFilesEventForNode({ currentWorkspace });

  const realm = useRemoteMDXEditorRealm("MdxEditorRealm");
  const editor = useCellValueForRealm(rootEditor$, realm);
  const handleDropEditor = (e: React.DragEvent<HTMLDivElement>) => {
    const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
    e.preventDefault();
    e.stopPropagation();
    if (editor) {
      editor.dispatchCommand(DROP_COMMAND, e.nativeEvent as DragEvent);
    }
  };
  return (
    <>
      <ServiceWorker>
        <Toaster />
        <div
          className="min-w-0 h-full flex w-full"
          onDrop={(e) => {
            handleDropEditor(e);
            // // const droppedElement = document.elementFromPoint(e.clientX, e.clientY);
            // const droppedElement = e.relatedTarget || e.target;
            // console.log("Dropped on element:", droppedElement);
            // void handleExternalDropEvent(e, OrphanRootNode);
          }}
        >
          <EditorSidebarLayout sidebar={<EditorSidebar className="main-editor-sidebar" />} main={children} />
        </div>
      </ServiceWorker>
    </>
  );
}
