"use client";

import {
  ChevronRight,
  Download,
  GitBranchIcon,
  GitMerge,
  Loader,
  Minus,
  Plus,
  RefreshCw,
  SatelliteDishIcon,
  Upload,
} from "lucide-react";
import React, { useState } from "react";

import { ConnectionsModal } from "@/components/connections-modal";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { GitRemote } from "@/features/git-repo/GitRepo";
import { useUIGitPlaybook, useWorkspaceRepo } from "@/features/git-repo/useGitHooks";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { cn } from "@/lib/utils";
import { Github, ChromeIcon as Google } from "lucide-react";
import { GitRemoteDialog } from "./GitRemoteDialog";

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
                <RemoteManager
                  remotes={info.remotes}
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
function RemoteManager({
  remotes,
  addGitRemote,
  deleteGitRemote,
}: {
  remotes: GitRemote[];
  addGitRemote: (remote: { name: string; url: string }) => void;
  deleteGitRemote: (remoteName: string) => void;
}) {
  const [mode, setMode] = useState<"select" | "delete">("select");
  const [value, setValue] = useState<string>("");

  return mode === "delete" ? (
    <RemoteDelete
      remotes={remotes}
      cancel={() => setMode("select")}
      onSelect={(name: string) => {
        if (name === value) setValue("");
        deleteGitRemote(name);
      }}
    />
  ) : (
    <RemoteSelect remotes={remotes} value={value} onSelect={setValue}>
      <GitRemoteDialog
        onSubmit={(remote) => {
          addGitRemote(remote);
          setValue(remote.name);
        }}
      >
        <Button variant="outline" className="h-8" size="sm">
          <Plus />
        </Button>
      </GitRemoteDialog>
      <Button variant="outline" className="h-8" size="sm" onClick={() => setMode("delete")}>
        <Minus />
      </Button>
    </RemoteSelect>
  );
}
function RemoteDelete({
  className,
  remotes,
  cancel,
  onSelect,
}: {
  className?: string;
  remotes: GitRemote[];
  cancel: () => void;
  onSelect: (remoteName: string) => void;
}) {
  return (
    <Select
      defaultOpen={true}
      onValueChange={onSelect}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <SelectTrigger className={cn(className, "w-full bg-background text-xs h-8")}>
        <SelectValue placeholder="Delete Remote" />
      </SelectTrigger>
      <SelectContent>
        {remotes.map((remote) => (
          <SelectItem
            key={remote.name}
            value={remote.name}
            className={
              "!text-xs focus:bg-destructive focus:text-primary-foreground w-full flex items-center justify-between"
            }
          >
            {remote.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const RemoteSelectPlaceHolder = (
  <div className="flex justify-center items-center">
    <SatelliteDishIcon className="p-1 mr-2 stroke-ring" />
    Remote
  </div>
);

function RemoteSelect({
  className,
  children,
  remotes,
  onSelect,
  value,
}: {
  className?: string;
  children: React.ReactNode;
  remotes: GitRemote[];
  onSelect: (value: string) => void;
  value: string;
}) {
  return (
    <div className="w-full flex items-center justify-between space-x-2">
      <Select key={value} onValueChange={(value) => onSelect(value)} value={value}>
        <SelectTrigger className={cn(className, "w-full bg-background text-xs h-8")}>
          <SelectValue placeholder={RemoteSelectPlaceHolder} />
        </SelectTrigger>
        <SelectContent>
          <div className="bg-background border rounded stroke-1"></div>
          {remotes.map((remote) => (
            <SelectItem key={remote.name} value={remote.name} className={"!text-xs"}>
              {remote.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </div>
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
