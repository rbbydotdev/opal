import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

export function TopToolbar() {
  return (
    <div className="bg-background h-12 flex items-center justify-start px-2 border-b border-border gap-4">
      <div>
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
      </div>
      <div className="flex items-center gap-2">
        {/* <PreviewPane pathname="/" /> */}
        <Button size="sm">Preview</Button>
        <Button size="sm">Button 2</Button>
        <Button size="sm">Button 3</Button>
      </div>
    </div>
  );
}
