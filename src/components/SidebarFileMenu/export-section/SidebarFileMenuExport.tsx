import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EncryptedZipDialog } from "@/components/ui/encrypted-zip-dialog";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { downloadEncryptedZipHelper } from "@/lib/ServiceWorker/downloadEncryptedZipHelper";
import { Lock } from "lucide-react";

import { Download, Info } from "lucide-react";
import React from "react";
// import { useWorkspaceContext } from "../../context/WorkspaceHooks";
// import { useSingleItemExpander } from "../../features/tree-expander/useSingleItemExpander";
// import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/ui/sidebar";
export function SidebarFileMenuExport(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("export");
  const { currentWorkspace } = useWorkspaceContext();
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
            <Button className="w-full text-xs" size="sm" variant="outline" asChild>
              <a href="/download.zip" className="flex">
                <Download className="mr-1 !w-4 !h-4 stroke-1" />
                <span className="w-full flex justify-center">Download Zip</span>
              </a>
            </Button>
            <EncryptedZipDialog
              onSubmit={(password) =>
                downloadEncryptedZipHelper({ password, encryption: "aes", name: currentWorkspace.name })
              }
            >
              <Button
                className="whitespace-normal text-center w-full text-xs relative group"
                size="sm"
                variant="outline"
                asChild
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
