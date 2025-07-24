import { sessionIdParam, useScrollSync } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { absPath, joinPath } from "@/lib/paths2";
import { Zap } from "lucide-react";
import Link from "next/link";

export function TopToolbar({ children }: { children?: React.ReactNode }) {
  const { id: workspaceId, path: filePath } = useWorkspaceRoute();
  const { sessionId } = useScrollSync();
  return (
    <div className="bg-background h-12 flex items-center justify-start border-b border-border gap-4 py-1">
      <div className="flex items-center gap-2">
        {children}
        {/* <Link href={`/preview/${workspaceId}/${filePath}`}> */}
        <Button size="sm" asChild>
          <Link
            href={joinPath(
              absPath("preview"),
              workspaceId!,
              filePath! + `?${sessionIdParam({ sessionId: sessionId! })}`
            )}
            target="_blank"
          >
            {/*  preview button */}
            Live Preview <Zap />
          </Link>
        </Button>
      </div>
    </div>
  );
}

{
  /* <div className="hidden">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New Tab <MenubarShortcut>⌘T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>New Window</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Share</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Print</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div> */
}
