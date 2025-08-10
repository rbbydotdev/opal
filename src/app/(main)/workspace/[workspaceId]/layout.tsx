import { EditorSidebar } from "@/components/EditorSidebar";
import { Toaster } from "@/components/ui/toaster";
import React from "react";
import { EditorSidebarLayout } from "./EditorSidebarLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout sidebar={<EditorSidebar className="main-editor-sidebar" />} main={children} />
      </div>
    </>
  );
}
