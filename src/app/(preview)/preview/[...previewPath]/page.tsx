"use client";
import { useFileContents } from "@/context/WorkspaceHooks";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { useMemo, useState } from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <div className="flex-1 overflow-hidden">
          <WorkspaceProvider>
            <PreviewComponent />
            {children}
          </WorkspaceProvider>
        </div>
      </div>
    </>
  );
}

function PreviewComponent() {
  // const { currentWorkspace } = useWorkspaceContext();
  const [contents, setContents] = useState<string | null>(null);
  const { initialContents } = useFileContents((contents) => {
    setContents(String(contents));
  });
  const html = useMemo(
    () => renderMarkdownToHtml(contents === null ? String(initialContents ?? "") : contents ?? ""),
    [contents, initialContents]
  );
  // if (!contents === null) return null;
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
