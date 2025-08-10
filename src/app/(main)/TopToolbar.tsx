// import { LivePreviewButton } from "@/components/Editor/LivePreviewButton";

export function TopToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-background h-12 flex items-center justify-start border-b border-border gap-4 py-1">
      <div className="flex items-center gap-2">
        {children}
        {/* <Link href={`/preview/${workspaceId}/${filePath}`}> */}
        {/* <LivePreviewButton /> */}
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
