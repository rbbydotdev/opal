"use client";

import { ChevronRight, Download, GitBranchIcon, GitMerge, Loader, Plus, RefreshCw, Upload } from "lucide-react";
import React from "react";

import { ConnectionsModal } from "@/components/connections-modal";
import { GitRemoteManager } from "@/components/SidebarFileMenu/sync-section/GitRemoteManager";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/TooltipToast";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useUIGitPlaybook, useWorkspaceRepo } from "@/features/git-repo/useGitHooks";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { Github, ChromeIcon as Google } from "lucide-react";

export function SidebarFileMenuSync(props: React.ComponentProps<typeof SidebarGroup>) {
  const { currentWorkspace } = useWorkspaceContext();
  const { repo, info } = useWorkspaceRepo(currentWorkspace);
  const { pendingCommand, commit, isPending } = useUIGitPlaybook(repo);
  const [expanded, setExpand] = useSingleItemExpander("sync");
  const { cmdRef: commitRef } = useTooltipToastCmd();
  const { cmdRef: remoteRef } = useTooltipToastCmd();
  return (
    <SidebarGroup className="pl-0 py-0" {...props}>
      <Collapsible className="group/collapsible flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="pl-0">
            <SidebarGroupLabel className="pl-2">
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
                  <GitBranchIcon size={12} className="mr-2" />
                  Git
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <div className="group-data-[state=closed]/collapsible:hidden">
          <ConnectionsModal>
            <SidebarGroupAction className="top-1.5">
              <Plus /> <span className="sr-only">Add Connection</span>
            </SidebarGroupAction>
          </ConnectionsModal>
        </div>

        <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
          <SidebarMenu className="gap-2">
            <div className="px-4 pt-2">
              {info.latestCommit?.oid && (
                <dl className="mb-4 grid [grid-template-columns:max-content_1fr] gap-x-2 font-mono text-2xs text-left">
                  <dt className="font-bold">commit:</dt>
                  <dd className="truncate">{info.latestCommit.oid}</dd>
                  <dt className="font-bold">date:</dt>
                  <dd className="truncate">{new Date(info.latestCommit.date).toLocaleString()}</dd>
                </dl>
              )}
              <Button
                className="w-full"
                onClick={() => {
                  void commit().then(() => commitRef.current.show());
                }}
                size="sm"
                variant="outline"
                disabled={isPending}
              >
                {pendingCommand === "commit" ? (
                  <Loader className="mr-1 animate-spin animation-iteration-infinite" />
                ) : (
                  <GitMerge className="mr-1" />
                )}
                <TooltipToast cmdRef={commitRef} message={"success!"} durationMs={1000} sideOffset={10} />
                Commit
              </Button>
            </div>

            <div className="px-4 my-2">
              <SidebarSeparator />
            </div>
            <div className="px-4 w-full flex justify-center ">
              <div className="flex flex-col items-center w-full">
                <TooltipToast cmdRef={remoteRef} durationMs={1000} sideOffset={0} />
                <GitRemoteManager
                  remotes={info.remotes}
                  replaceGitRemote={(remoteName, remote) => {
                    void repo.replaceGitRemote(remoteName, remote);
                    remoteRef.current.show("remote replaced");
                  }}
                  addGitRemote={(remoteName) => {
                    void repo.addGitRemote(remoteName);
                    remoteRef.current.show("remote added");
                  }}
                  deleteGitRemote={(remoteName) => {
                    void repo.deleteGitRemote(remoteName);
                    remoteRef.current.show("remote deleted");
                  }}
                />
              </div>
            </div>
            <div className="px-4">
              <Button className="w-full " size="sm" variant="outline">
                <RefreshCw className="mr-1" onClick={() => {}} />
                Sync Now
              </Button>
            </div>
            <div className="px-4">
              <Button className="w-full " size="sm" variant="outline">
                <Download className="mr-1" />
                Pull
              </Button>
            </div>
            <div className="px-4">
              <Button className="w-full " size="sm" variant="outline">
                <Upload className="mr-1" />
                Push
              </Button>
            </div>
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export const VENDOR_ICONS = {
  GitHub: <Github size={12} />,
  Google: <Google size={12} />,
};
export const MOCK_CONNECTIONS = []; /* [
  {
    name: "GitHub",
    type: "oauth",
    vendor: "GitHub",
  },
  {
    name: "GitHub API",
    type: "apikey",
    vendor: "GitHub",
  },
  {
    name: "Google Drive",
    type: "oauth",
    vendor: "Google",
  },
  {
    name: "Google Drive API",
    type: "apikey",
    vendor: "Google",
  },
];
*/

{
  /* <SidebarGroup className="pl-2">
            <SidebarGroupLabel>
              <div className="w-full text-xs text-sidebar-foreground/70">Connections</div>
            </SidebarGroupLabel>
            <SidebarMenu>
              {MOCK_CONNECTIONS.map((connection, i) => (
                <SidebarMenuItem key={connection.name}>
                  <SidebarMenuButton className="flex justify-start w-full text-xs p-1">
                    <div className="w-full whitespace-nowrap flex items-center space-x-1">
                      {i === 0 ? (
                        <div className="w-4 h-4 text-success items-center justify-center flex">
                          <Check size={10} strokeWidth={4} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 items-center justify-center flex">
                          <DotIcon size={14} strokeWidth={4} fill="black" />
                        </div>
                      )}
                      <span className="rounded-full p-1 border">
                        {VENDOR_ICONS[connection.vendor as keyof typeof VENDOR_ICONS]}
                      </span>
                      <span className="overflow-clip text-ellipsis">{connection.name}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup> */
}
