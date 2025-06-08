"use client";
import { EditorSidebarLayout } from "@/app/workspace/[workspaceId]/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { FileTreeMenuContextProvider } from "@/components/FileTreeProvider";
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
    <>
      <ServiceWorker>
        <FileTreeMenuContextProvider>
          <Toaster />
          <div className="min-w-0 h-full flex w-full">
            <EditorSidebarLayout sidebar={<EditorSidebar />} main={children} />
          </div>
        </FileTreeMenuContextProvider>
      </ServiceWorker>
    </>
  );
}
