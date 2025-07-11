"use client";
import { EditorSidebarLayout } from "@/app/workspace/[workspaceId]/EditorSidebarLayout";
import { EditorSidebar } from "@/components/EditorSidebar";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorker>
        <Toaster />
        <div className="min-w-0 h-full flex w-full">
          <EditorSidebarLayout sidebar={<EditorSidebar className="main-editor-sidebar" />} main={children} />
        </div>
      </ServiceWorker>
    </>
  );
}
