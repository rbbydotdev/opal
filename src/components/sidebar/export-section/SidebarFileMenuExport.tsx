import { EncryptedZipDialog } from "@/components/enc-zip-modal/encrypted-zip-dialog";
import { SidebarGripChevron } from "@/components/sidebar/build-section/SidebarGripChevron";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { downloadEncryptedZipHelper } from "@/lib/service-worker/downloadEncryptedZipHelper";
import { downloadWorkspaceZipURL } from "@/lib/service-worker/downloadZipURL";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { Download, Info, Lock } from "lucide-react";
import React, { useMemo } from "react";

// downloadZipURL will be calculated in component

export function SidebarFileMenuExport(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("export");
  const { currentWorkspace } = useWorkspaceContext();

  const downloadZipURL = useMemo(() => downloadWorkspaceZipURL(currentWorkspace.name), [currentWorkspace.name]);

  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <SidebarGripChevron />
              <div className="w-full">
                <div className="flex justify-center items-center">
                  <Download size={12} className="mr-2" />
                  Export
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-2">
            <Button tabIndex={0} className="w-full text-xs" size="sm" variant="outline" asChild>
              <a href={downloadZipURL} className="flex">
                <Download className="mr-1 !w-4 !h-4 stroke-1" />
                <span className="w-full flex justify-center">Download Zip</span>
              </a>
            </Button>
            <EncryptedZipDialog
              onSubmit={(password) =>
                downloadEncryptedZipHelper({
                  password,
                  encryption: "aes",
                  workspaceName: currentWorkspace.name,
                  name: currentWorkspace.name,
                })
              }
            >
              <Button
                className="whitespace-normal text-center w-full text-xs relative group"
                size="sm"
                variant="outline"
                asChild
                tabIndex={0}
              >
                <div className="flex">
                  <Lock className="inline !w-4 !h-4 stroke-1" />
                  <div className="absolute -top-0 right-0 group-hover:block hidden">
                    <Tooltip>
                      <TooltipTrigger>
                        <Info />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>AES, probably not secure - but its a cool idea!</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="w-full">Download Encrypted Zip</span>
                </div>
              </Button>
            </EncryptedZipDialog>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
