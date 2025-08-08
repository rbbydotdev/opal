import { ConnectionsModal } from "@/components/connections-modal";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { ChevronRight, Plus, Sparkle, MoreHorizontal, Pencil, Trash2, Key, Github } from "lucide-react";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function ConnectionManager() {
  const { remoteAuths, loading, deleteRemoteAuth, refetch } = useRemoteAuths();
  const [mode, setMode] = useState<"list" | "delete">("list");
  const [editingConnection, setEditingConnection] = useState<{
    id: string;
    name: string;
    type: string;
    authType: "api" | "oauth";
  } | null>(null);

  const handleEdit = (connection: typeof remoteAuths[0]) => {
    setEditingConnection({
      id: connection.id,
      name: connection.name,
      type: connection.authType === "api" ? "github-api" : "github-oauth",
      authType: connection.authType,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRemoteAuth(id);
  };

  const getConnectionIcon = (authType: "api" | "oauth") => {
    switch (authType) {
      case "api":
        return <Key className="w-4 h-4" />;
      case "oauth":
        return <Github className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  if (mode === "delete") {
    return (
      <div className="px-4 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-destructive">Delete Mode</span>
          <Button size="sm" variant="outline" onClick={() => setMode("list")}>
            Cancel
          </Button>
        </div>
        {remoteAuths.map((connection) => (
          <SidebarMenuItem key={connection.id}>
            <SidebarMenuButton
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(connection.id)}
            >
              {getConnectionIcon(connection.authType)}
              <span className="truncate">{connection.name}</span>
              <Trash2 className="w-4 h-4 ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Add Connection Modal */}
      <ConnectionsModal onSuccess={refetch}>
        <SidebarGroupAction className="top-1.5">
          <Plus /> <span className="sr-only">Add Connection</span>
        </SidebarGroupAction>
      </ConnectionsModal>

      {/* Edit Connection Modal */}
      <ConnectionsModal
        mode="edit"
        editConnection={editingConnection}
        open={!!editingConnection}
        onOpenChange={(open) => {
          if (!open) setEditingConnection(null);
        }}
        onSuccess={() => {
          refetch();
          setEditingConnection(null);
        }}
      >
        <div />
      </ConnectionsModal>

      <CollapsibleContent className="flex flex-col flex-shrink overflow-y-auto">
        <SidebarMenu className="gap-2">
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
          {!loading && remoteAuths.map((connection) => (
            <SidebarMenuItem key={connection.id}>
              <SidebarMenuButton className="group pl-2 pr-1">
                <div className="flex items-center flex-1 min-w-0">
                  {getConnectionIcon(connection.authType)}
                  <span className="truncate ml-2">{connection.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">
                    {connection.authType}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(connection)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setMode("delete")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuButton>
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
