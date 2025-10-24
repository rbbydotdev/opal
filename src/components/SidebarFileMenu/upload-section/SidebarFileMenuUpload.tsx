import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { handleDropFilesEventForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { Loader, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";

export function SidebarFileMenuUpload(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("upload");
  const { currentWorkspace } = useWorkspaceContext();
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <SidebarGripChevron />
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
              <form className="w-full flex flex-col gap-2">
                <label
                  htmlFor="file-upload"
                  className="border-dashed border rounded px-3 py-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setPending(true);
                    void handleDropFilesEventForNode({ currentWorkspace, event, targetNode: RootNode }).finally(() => {
                      setPending(false);
                    });
                  }}
                >
                  {pending ? (
                    <Loader className="animate-spin mx-auto mb-2 w-5" size={24} />
                  ) : (
                    <UploadIcon className="mx-auto mb-2 w-5 text-sidebar-foreground/70" size={24} />
                  )}

                  <span className="text-sidebar-foreground/70 block text-xs mb-2">
                    Drag & drop files here or click to select
                  </span>
                  <input
                    ref={fileUploadRef}
                    id="file-upload"
                    type="file"
                    accept="image/*,text/css,text/markdown,.md,.docx"
                    multiple={true}
                    className="hidden"
                    onChange={(e) => {
                      setPending(true);
                      void handleDropFilesEventForNode({
                        currentWorkspace,
                        event: { dataTransfer: { files: e.target.files } },
                        targetNode: RootNode,
                      }).finally(() => setPending(false));
                    }}
                  />
                </label>
              </form>
            </SidebarGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
