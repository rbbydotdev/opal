import { Navbar } from "@/app/Navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { Editor } from "@/components/Editor/Editor";
import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import fs from "fs";

const md = fs.readFileSync(process.cwd() + "/src/app/kitchen-sink.md", "utf-8");
export default async function Home() {
  return (
    <div>
      <SidebarProvider>
        <div className="flex w-full h-screen">
          <div className="">
            <AppSidebar />
          </div>
          <div className="flex-grow h-screen flex">
            <div className="w-full flex flex-col">
              <Navbar>
                <SidebarTrigger />
                <ModeToggle />
                <Button variant={"outline"}>Button</Button>
              </Navbar>
              <div className="flex-grow">
                <div className="overflow-auto min-w-full w-0 ">
                  <Editor
                    markdown={md}
                    className="flex flex-col"
                    contentEditableClassName="max-w-full overflow-auto content-editable"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
