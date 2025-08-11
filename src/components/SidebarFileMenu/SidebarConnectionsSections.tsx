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
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { cn } from "@/lib/utils";
import { ChevronRight, Github, Key, MoreHorizontal, Pencil, Plus, Sparkle, Trash2 } from "lucide-react";
import { useState } from "react";

type ConnectionType = {
  guid: string;
  name: string;
  type: string;
  authType: "api" | "oauth";
};

function ConnectionManager() {
  const { remoteAuths, loading, deleteRemoteAuth, refetch } = useRemoteAuths();
  const [editingConnection, setEditingConnection] = useState<ConnectionType | null>(null);

  const handleEdit = (connection: (typeof remoteAuths)[0]) => {
    setEditingConnection({
      guid: connection.guid,
      name: connection.name,
      type: connection.authType === "api" ? "github-api" : "github-oauth",
      authType: connection.authType,
    });
  };

  const ConnectionIcon = ({ authType, className }: { authType: "api" | "oauth"; className?: string }) => {
    switch (authType) {
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
      {/* Add Connection Modal */}
      <ConnectionsModal onSuccess={refetch}>
        <SidebarGroupAction className="top-1.5 p-3">
          <Plus /> <span className="sr-only">Add Connection</span>
        </SidebarGroupAction>
      </ConnectionsModal>

      {/* Edit Connection Modal */}
      <ConnectionsModal
        mode="edit"
        editConnection={editingConnection!}
        open={Boolean(editingConnection)}
        onOpenChange={(open) => {
          if (!open) setEditingConnection(null);
        }}
        onSuccess={() => {
          void refetch();
          setEditingConnection(null);
        }}
      >
        <div />
      </ConnectionsModal>

      <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
        <SidebarMenu>
          {loading && (
            <div className="px-4 py-2">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
          {!loading && remoteAuths.length === 0 && (
            <div className="px-4 py-2">
              <EmptySidebarLabel label="no connections" />
            </div>
          )}
          {!loading &&
            remoteAuths.map((connection) => (
              <SidebarMenuItem key={connection.guid}>
                <div className="group flex items-center pr-1">
                  <SidebarMenuButton className="flex-1 min-w-0 pl-8">
                    <div className="flex items-center flex-1 min-w-0 gap-1">
                      <ConnectionIcon authType={connection.authType} className="flex-shrink-0" />
                      <span className="font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink-0">
                        {connection.name}
                      </span>
                      <span className="flex-shrink-0">{"/"}</span>
                      <span className="text-xs text-muted-foreground capitalize font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                        {connection.authType}{" "}
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
