// import { ConnectionsModal } from "@/components/connections-modal";
import { useConfirm } from "@/components/Confirm";
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
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { IS_MAC } from "@/lib/isMac";
import {
  Check,
  Delete,
  Ellipsis,
  Github,
  LucideProps,
  MoreHorizontal,
  Pencil,
  Sparkle,
  SquareDashed,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export type ItemType = {
  id: string;
  label: React.ReactNode;
  subLabel: React.ReactNode;
  Icon: React.ComponentType<LucideProps>;
};

function ItemsSectionManager({
  children,
  setEditingId,
  // editingId,
}: {
  children: React.ReactNode;
  setEditingId: (id: string | null) => void;
  // editingId: string | null;
}) {
  const items: ItemType[] = [
    { id: "1", Icon: Github, label: "Connection 1", subLabel: "Details about connection 1" },
    { id: "2", Icon: Github, label: "Connection 2", subLabel: "Details about connection 2" },
  ]; // Placeholder for useRemoteAuthRecords();
  // const handleSelect = (id: string) => {};

  const deleteRemoteAuth = (id: string) => {
    console.log("Delete connection with id:", id);
  }; // Placeholder for useDeleteRemoteAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelected = (id: string) =>
    isSelected(id) ? setSelected((prev) => prev.filter((i) => i !== id)) : setSelected((prev) => [...prev, id]);
  const isSelected = (id: string) => selected.includes(id);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const { open: openConfirm } = useConfirm();

  const handleEdit = (id: string) => {
    setEditingId(id);
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

  const handleSelect = (sectionRef: React.RefObject<HTMLDivElement | null>, event: React.MouseEvent, id: string) => {
    event.preventDefault();

    if (event.metaKey || event.ctrlKey) {
      if (sectionRef?.current) sectionRef.current.focus();
      toggleSelected(id);
    } else {
      handleEdit(id);
    }
  };

  return (
    <>
      <div className="group-data-[state=closed]/collapsible:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {items.length && (
              <SidebarGroupAction className="top-1.5 p-0 right-0" title="Connections Menu">
                <Ellipsis /> <span className="sr-only">Connections Menu</span>
              </SidebarGroupAction>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setSelected(items.map((r) => r.id))}
              className="grid grid-cols-[auto_1fr] items-center gap-2"
              disabled={items.length === selected.length}
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

      {children}

      <CollapsibleContent>
        <SidebarMenu>
          {items.length === 0 && (
            <div className="px-4 py-2">
              <EmptySidebarLabel label="no connections" />
            </div>
          )}
          {items.map(({ Icon, subLabel, label, id }) => (
            <SidebarMenuItem key={id}>
              <div className="group flex items-center pr-1 py-0">
                <SidebarMenuButton className="flex-1 min-w-0 pl-4" onClick={(e) => handleSelect(sectionRef, e, id)}>
                  <div className="flex items-center flex-1 min-w-0 gap-1 text-xs ml-[0.17rem]">
                    <div className="w-4 h-4 flex justify-center items-center mr-0.5 shrink-0">
                      {isSelected(id) && <Check className="w-3 h-3 rounded-full _border" />}
                    </div>
                    <Icon size={12} className="flex-shrink-0" />
                    <span className="max-w-[32ch] font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink ml-1">
                      {label}
                    </span>
                    <span className="flex-shrink-0 text-xs">{"/"}</span>
                    <span className="text-xs text-muted-foreground capitalize font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                      {subLabel}
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
                    <DropdownMenuItem onClick={() => handleEdit(id)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteRemoteAuth(id)}>
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

function ItemsSection({ children, ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("connections");

  return (
    <SidebarGroup className="pl-0 py-0" {...props}>
      <Collapsible className="group/collapsible flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
        {children}
      </Collapsible>
    </SidebarGroup>
  );
}
// <ItemsSectionHeader />
// <ItemsSectionManager setEditingId={() => {}} children={null} />
function Foo() {
  return (
    <ItemsSection>
      <ItemsSectionHeader>
        <Sparkle size={12} className="mr-2" />
        Connections
      </ItemsSectionHeader>
      <ItemsSectionManager setEditingId={() => {}} children={null} />
    </ItemsSection>
  );
}

function ItemsSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <CollapsibleTrigger asChild>
      <SidebarMenuButton className="pl-0">
        <SidebarGroupLabel className="pl-2">
          <SidebarGripChevron />
          <div className="w-full">
            <div className="w-full flex justify-center items-center">{children}</div>
          </div>
        </SidebarGroupLabel>
      </SidebarMenuButton>
    </CollapsibleTrigger>
  );
}
