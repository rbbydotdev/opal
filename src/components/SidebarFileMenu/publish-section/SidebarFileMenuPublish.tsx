import { SidebarGripChevron } from "@/components/SidebarFileMenu/publish-section/SidebarGripChevron";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { Workspace } from "@/Db/Workspace";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { Code2, FileTextIcon, Github, UploadCloud, UploadCloudIcon } from "lucide-react";
import { useMemo } from "react";

export function SidebarFileMenuPublish({
  currentWorkspace,
  ...props
}: React.ComponentProps<typeof SidebarGroup> & {
  currentWorkspace: Workspace;
}) {
  const [expanded, setExpand] = useSingleItemExpander("publish");
  const { info } = useWorkspaceGitRepo({ currentWorkspace });
  const githubConnected = useMemo(() => info.remotes.some((r) => r.url.includes("github.com")), [info]);
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <SidebarGripChevron />
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
                <span className="flex-grow"> Publish to Web</span>
              </Button>
              <Button className="w-full flex text-xs" size="sm" variant="outline">
                <Code2 className="mr-1" />
                <span className="flex-grow">Publish to HTML</span>
              </Button>
              <Button className="w-full text-xs" size="sm" variant="outline">
                <FileTextIcon className="mr-1" />
                <span className="flex-grow">Publish to PDF</span>
              </Button>
              {githubConnected && (
                <Button className="w-full text-xs" size="sm" variant="outline">
                  <Github className="mr-1" />
                  <span className="flex-grow">Publish to Github Pages</span>
                </Button>
              )}
            </SidebarGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
