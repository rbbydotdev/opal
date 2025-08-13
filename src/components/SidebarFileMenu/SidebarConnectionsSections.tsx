// import { ConnectionsModal } from "@/components/connections-modal";
import { ConnectionsModal } from "@/components/ConnectionsModal";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { RemoteAuthJType, RemoteAuthSource, RemoteAuthType } from "@/Db/RemoteAuth";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { cn } from "@/lib/utils";
import { ChevronRight, Github, Key, MoreHorizontal, Pencil, Plus, Sparkle, Trash2 } from "lucide-react";
import { useState } from "react";

function ConnectionManager() {
  const { remoteAuths, deleteRemoteAuth } = useRemoteAuths();
  const [editingConnection, setEditingConnection] = useState<RemoteAuthJType | null>(null);

  const handleEdit = (connection: (typeof remoteAuths)[0]) => {
    setEditingConnection(connection);
  };

  const ConnectionIcon = ({
    type,
    source,
    className,
  }: {
    type: RemoteAuthType;
    source: RemoteAuthSource;
    className?: string;
  }) => {
    switch (type) {
      case "api":
        return <Key className={cn("w-4 h-4", className)} />;
      case "oauth":
        return <Github className={cn("w-4 h-4", className)} />;
      default:
        return <Key className={cn("w-4 h-4", className)} />;
    }
  };

  return (
    <>
      <ConnectionsModal>
        <SidebarGroupAction className="top-1.5 p-3">
          <Plus /> <span className="sr-only">Add Connection</span>
        </SidebarGroupAction>
      </ConnectionsModal>
      <ConnectionsModal
        mode="edit"
        editConnection={editingConnection!}
        open={Boolean(editingConnection)}
        onOpenChange={(open) => {
          if (!open) setEditingConnection(null);
        }}
        onSuccess={() => setEditingConnection(null)}
      >
        <div />
      </ConnectionsModal>

      <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
        <SidebarMenu>
          {remoteAuths.length === 0 && (
            <div className="px-4 py-2">
              <EmptySidebarLabel label="no connections" />
            </div>
          )}
          {remoteAuths.map((connection) => (
            <SidebarMenuItem key={connection.guid}>
              <div className="group flex items-center pr-1">
                <SidebarMenuButton className="flex-1 min-w-0 pl-8">
                  <div className="flex items-center flex-1 min-w-0 gap-1">
                    <ConnectionIcon type={connection.type} source={connection.source} className="flex-shrink-0" />
                    <span className="max-w-[32ch] font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink">
                      {connection.name}
                    </span>
                    <span className="flex-shrink-0">{"/"}</span>
                    <span className="text-xs text-muted-foreground capitalize font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                      {`${connection.type} ${connection.source}`.toLowerCase()}
                    </span>
                  </div>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-4.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(connection)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteRemoteAuth(connection.guid)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </CollapsibleContent>
    </>
  );
}

export function SidebarConnectionsSection(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("connections");

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
                  <Sparkle size={12} className="mr-2" />
                  Connections
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <div className="group-data-[state=closed]/collapsible:hidden">
          <ConnectionManager />
        </div>
      </Collapsible>
    </SidebarGroup>
  );
}
