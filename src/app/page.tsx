import { Navbar } from "@/app/Navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { Editor } from "@/components/Editor/Editor";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import fs from "fs";

export default function Home() {
  const md = fs.readFileSync(process.cwd() + "/src/app/kitchen-sink.md", "utf-8");
  return (
    <SidebarProvider>
      <div className="flex w-full h-screen">
        <div className="">
          <AppSidebar />
        </div>
        <div className="flex-grow h-screen flex">
          <div className="w-full flex flex-col">
            <Navbar>
              <SidebarTrigger />
            </Navbar>
            <div className=" flex-grow">
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
  );
}
