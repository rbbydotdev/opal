// import { ConnectionsModal } from "@/components/connections-modal";
import { useConfirm } from "@/components/Confirm";
import { ConnectionsModal } from "@/components/ConnectionsModal";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { RemoteAuthJType, RemoteAuthRecord } from "@/Db/RemoteAuthTypes";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { IS_MAC } from "@/lib/isMac";
import { cn } from "@/lib/utils";
import { Check, Delete, Ellipsis, MoreHorizontal, Pencil, Plus, Sparkle, SquareDashed } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function ConnectionManager() {
  const { remoteAuths, deleteRemoteAuth } = useRemoteAuths();
  const [editingConnection, setEditingConnection] = useState<RemoteAuthJType | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelected = (id: string) =>
    isSelected(id) ? setSelected((prev) => prev.filter((i) => i !== id)) : setSelected((prev) => [...prev, id]);
  const isSelected = (id: string) => selected.includes(id);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const { open: openConfirm } = useConfirm();

  const handleEdit = (connection: RemoteAuthRecord) => {
    setEditingConnection(connection);
  };

  useEffect(() => {
    if (!sectionRef?.current) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected.length) setSelected([]);
    };
    sectionRef.current.addEventListener("keydown", handleEscape, { passive: true });
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sectionRef, selected.length]);

  const handleDeleteAll = () =>
    openConfirm(
      () => {
        selected.forEach((id) => deleteRemoteAuth(id));
        setSelected([]);
      },
      "Delete Connections",
      `Are you sure you want to delete ${selected.length} connection(s)? This action cannot be undone.`
    );

  const handleSelect = (
    sectionRef: React.RefObject<HTMLDivElement | null>,
    event: React.MouseEvent,
    connection: RemoteAuthRecord
  ) => {
    event.preventDefault();

    if (event.metaKey || event.ctrlKey) {
      if (sectionRef?.current) sectionRef.current.focus();
      toggleSelected(connection.guid);
    } else {
      handleEdit(connection);
    }
  };

  return (
    <>
      {/* <div ref={sectionRef} tabIndex={0}> */}
      <div>
        <ConnectionsModal>
          <SidebarGroupAction className={cn("top-1.5 p-0", { "right-8": remoteAuths.length })} title="Add Connection">
            <Plus className="w-4 h-4" /> <span className="sr-only">Add Connection</span>
          </SidebarGroupAction>
        </ConnectionsModal>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {remoteAuths.length && (
              <SidebarGroupAction className="top-1.5 p-0 right-0" title="Connections Menu">
                <Ellipsis /> <span className="sr-only">Connections Menu</span>
              </SidebarGroupAction>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setSelected(remoteAuths.map((r) => r.guid))}
              className="grid grid-cols-[auto_1fr] items-center gap-2"
              disabled={remoteAuths.length === selected.length}
            >
              <Check className="w-4 h-4" />
              <span>Select All</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelected([])}
              className="grid grid-cols-[auto_1fr] items-center gap-2"
              disabled={!selected.length}
            >
              <SquareDashed className="w-4 h-4" />
              <span>Deselect All</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleDeleteAll}
              className="grid grid-cols-[auto_1fr] items-center gap-2"
              disabled={!selected.length}
            >
              <Delete className="w-4 h-4 text-destructive" />
              <span>Delete Selected</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="py-2 text-2xs w-full text-muted-foreground font-thin">
              {IS_MAC ? "⌘ cmd" : "^ ctrl"} + click connections / multi-select
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* <div ref={sectionRef} tabIndex={0}>
        {!!selected.length && (
          <>
            <SidebarGroupAction className="top-1.5 p-0 right-16" onClick={() => setSelected([])} title="Deselect All">
              <SquareDashed /> <span className="sr-only">Deselect All</span>
            </SidebarGroupAction>
            <SidebarGroupAction className="top-1.5 p-0 right-8" onClick={handleDeleteAll} title="Delete Selected">
              <Minus /> <span className="sr-only">Delete Selected</span>
            </SidebarGroupAction>
          </>
        )}
        <ConnectionsModal>
          <SidebarGroupAction className="top-1.5 p-0">
            <Plus /> <span className="sr-only">Add Connection</span>
          </SidebarGroupAction>
        </ConnectionsModal>
      </div> */}

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

      <CollapsibleContent>
        <SidebarMenu>
          {remoteAuths.length === 0 && (
            <div className="px-4 py-2">
              <EmptySidebarLabel label="no connections" />
            </div>
          )}
          {remoteAuths.map((connection) => (
            <SidebarMenuItem key={connection.guid}>
              <div className="group flex items-center pr-1 py-0">
                <SidebarMenuButton
                  className="flex-1 min-w-0 pl-4"
                  onClick={(e) => handleSelect(sectionRef, e, connection)}
                >
                  <div className="flex items-center flex-1 min-w-0 gap-1 text-xs ml-[0.17rem]">
                    <div className="w-4 h-4 flex justify-center items-center mr-0.5 shrink-0">
                      {isSelected(connection.guid) && <Check className="w-3 h-3 rounded-full _border" />}
                    </div>
                    <RemoteAuthSourceIconComponent
                      type={connection.type}
                      source={connection.source}
                      size={12}
                      className="flex-shrink-0"
                    />
                    <span className="max-w-[32ch] font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink ml-1">
                      {connection.name}
                    </span>
                    <span className="flex-shrink-0 text-xs">{"/"}</span>
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
                      <Delete className="w-4 h-4 mr-2 text-destructive" />
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
              <SidebarGripChevron />
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
