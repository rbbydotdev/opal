"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { ChevronRight, UploadIcon } from "lucide-react";

export function SidebarFileMenuUpload(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("upload");
  const { currentWorkspace } = useWorkspaceContext();
  const _fileMgr = useWorkspaceFileMgmt(currentWorkspace);
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <div className="flex items-center">
                <ChevronRight
                  size={14}
                  className={
                    "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                  }
                />
              </div>
              <div className="w-full">
                <div className="flex justify-center items-center">
                  <UploadIcon size={12} className="mr-2" />
                  Upload
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-4">
            <SidebarGroup className="gap-2 flex flex-col">
              <form
                className="w-full flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log("Form submitted");
                  const input = e.target as HTMLFormElement;
                  const fileInput = input.querySelector<HTMLInputElement>("#file-upload");
                  console.log("Files to upload:", fileInput?.files);
                }}
              >
                <label
                  htmlFor="file-upload"
                  className="border-dashed border-2 rounded px-4 py-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    console.log("Drag over");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    console.log("File dropped", e.dataTransfer.files);
                  }}
                >
                  <UploadIcon className="mx-auto mb-2" size={24} />
                  <span className="block text-xs mb-2">Drag & drop files here or click to select</span>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      console.log("File selected", e.target.files);
                    }}
                  />
                </label>
                <Button className="w-full text-xs" size="sm" variant="outline" type="submit">
                  <UploadIcon className="mr-1" />
                  Upload File
                </Button>
              </form>
            </SidebarGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
