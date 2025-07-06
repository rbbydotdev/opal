"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { ChevronRight, Code2, FileTextIcon, UploadCloud, UploadCloudIcon } from "lucide-react";

export function SidebarFileMenuPublish(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("publish");
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
                  <UploadCloudIcon size={12} className="mr-2" />
                  Publish
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-4">
            <SidebarGroup className="gap-2 flex flex-col">
              <SidebarGroupLabel>Workspace Actions</SidebarGroupLabel>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <UploadCloud className="mr-1" />
                Publish to Web
              </Button>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <Code2 className="mr-1" />
                Publish to HTML
              </Button>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <FileTextIcon className="mr-1" />
                Publish to PDF
              </Button>
            </SidebarGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
