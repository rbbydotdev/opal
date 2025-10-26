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
import { cn } from "@/lib/utils";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { IS_MAC } from "@/lib/isMac";
import {
  Check,
  Delete,
  Ellipsis,
  LucideProps,
  MoreHorizontal,
  Pencil,
  SquareDashed,
} from "lucide-react";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export type SelectableItem = {
  id: string;
  label: React.ReactNode;
  subLabel?: React.ReactNode;
  Icon?: React.ComponentType<LucideProps>;
};

type SelectableListContextValue = {
  items: SelectableItem[];
  selected: string[];
  isSelected: (id: string) => boolean;
  toggleSelected: (id: string) => void;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  handleSelect: (sectionRef: React.RefObject<HTMLDivElement | null>, event: React.MouseEvent, id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyLabel?: string;
};

const SelectableListContext = createContext<SelectableListContextValue | null>(null);

const useSelectableListContext = () => {
  const context = useContext(SelectableListContext);
  if (!context) {
    throw new Error('SelectableList compound components must be used within SelectableList.Root');
  }
  return context;
};

type SelectableListRootProps = {
  children: React.ReactNode;
  items: SelectableItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyLabel?: string;
  expanderId: string;
};

function SelectableListRoot({
  children,
  items,
  onEdit,
  onDelete,
  emptyLabel = "no items",
  expanderId,
}: SelectableListRootProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelected = (id: string) =>
    isSelected(id) ? setSelected((prev) => prev.filter((i) => i !== id)) : setSelected((prev) => [...prev, id]);
  const isSelected = (id: string) => selected.includes(id);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = (sectionRef: React.RefObject<HTMLDivElement | null>, event: React.MouseEvent, id: string) => {
    event.preventDefault();

    if (event.metaKey || event.ctrlKey) {
      if (sectionRef?.current) sectionRef.current.focus();
      toggleSelected(id);
    } else {
      onEdit?.(id);
    }
  };

  useEffect(() => {
    if (!sectionRef?.current) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected.length) setSelected([]);
    };
    sectionRef.current.addEventListener("keydown", handleEscape, { passive: true });
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sectionRef, selected.length]);

  const contextValue: SelectableListContextValue = {
    items,
    selected,
    isSelected,
    toggleSelected,
    setSelected,
    handleSelect,
    onEdit,
    onDelete,
    emptyLabel,
  };

  const [expanded, setExpand] = useSingleItemExpander(expanderId);

  return (
    <SelectableListContext.Provider value={contextValue}>
      <SidebarGroup className="pl-0 py-0">
        <Collapsible className="group/collapsible flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
          <div ref={sectionRef} tabIndex={-1}>
            {children}
          </div>
        </Collapsible>
      </SidebarGroup>
    </SelectableListContext.Provider>
  );
}

type SelectableListActionsProps = {
  children?: React.ReactNode;
};

function SelectableListActions({ children }: SelectableListActionsProps) {
  const { items, selected, setSelected, onDelete } = useSelectableListContext();
  const { open: openConfirm } = useConfirm();

  const handleDeleteAll = () => {
    if (!onDelete) return;
    openConfirm(
      () => {
        selected.forEach((id) => onDelete(id));
        setSelected([]);
      },
      "Delete Items",
      `Are you sure you want to delete ${selected.length} item(s)? This action cannot be undone.`
    );
  };

  return (
    <div className="group-data-[state=closed]/collapsible:hidden">
      {/* Custom action buttons (like Add button) */}
      {children}
      
      {/* Dropdown menu for bulk actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {items.length > 0 && (
            <SidebarGroupAction className={cn("top-1.5 p-0", children ? "right-0" : "right-0")} title="Items Menu">
              <Ellipsis /> <span className="sr-only">Items Menu</span>
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
          {onDelete && (
            <>
              <DropdownMenuItem
                onClick={handleDeleteAll}
                className="grid grid-cols-[auto_1fr] items-center gap-2"
                disabled={!selected.length}
              >
                <Delete className="w-4 h-4 text-destructive" />
                <span>Delete Selected</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="py-2 text-2xs w-full text-muted-foreground font-thin">
            {IS_MAC ? "⌘ cmd" : "^ ctrl"} + click items / multi-select
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SelectableListHeader({ children }: { children: React.ReactNode }) {
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

function SelectableListContent({ children }: { children?: React.ReactNode }) {
  const { items, selected, isSelected, handleSelect, onEdit, onDelete, emptyLabel } = useSelectableListContext();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      {children}
      <CollapsibleContent>
        <SidebarMenu>
          {items.length === 0 && (
            <div className="px-4 py-2">
              <EmptySidebarLabel label={emptyLabel} />
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
                    {Icon && <Icon size={12} className="flex-shrink-0" />}
                    <span className="max-w-[32ch] font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink ml-1">
                      {label}
                    </span>
                    {subLabel && (
                      <>
                        <span className="flex-shrink-0 text-xs">{"/"}</span>
                        <span className="text-xs text-muted-foreground capitalize font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                          {subLabel}
                        </span>
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
                {(onEdit || onDelete) && (
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
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(id)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(id)}>
                          <Delete className="w-4 h-4 mr-2 text-destructive" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </CollapsibleContent>
    </>
  );
}

type SelectableListTriggerProps = {
  children: React.ReactNode;
  onTrigger?: () => void;
};

function SelectableListTrigger({ children, onTrigger }: SelectableListTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full mb-2"
      onClick={onTrigger}
    >
      {children}
    </Button>
  );
}

type SelectableListActionButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
};

function SelectableListActionButton({ children, onClick, title, className }: SelectableListActionButtonProps) {
  const { items } = useSelectableListContext();
  
  return (
    <SidebarGroupAction 
      className={cn("top-1.5 p-0", { "right-8": items.length }, className)} 
      title={title}
      onClick={onClick}
    >
      {children}
    </SidebarGroupAction>
  );
}

export const SelectableList = {
  Root: SelectableListRoot,
  Header: SelectableListHeader,
  Actions: SelectableListActions,
  ActionButton: SelectableListActionButton,
  Content: SelectableListContent,
  Trigger: SelectableListTrigger,
};

// Example Usage:
/*
import { Github, Sparkle, Plus } from "lucide-react";

function ConnectionsExample() {
  const connections = [
    { id: "1", Icon: Github, label: "Connection 1", subLabel: "github.com/user1" },
    { id: "2", Icon: Github, label: "Connection 2", subLabel: "github.com/user2" },
  ];

  const handleEdit = (id: string) => {
    console.log("Edit connection:", id);
  };

  const handleDelete = (id: string) => {
    console.log("Delete connection:", id);
  };

  const handleAddConnection = () => {
    console.log("Add new connection");
  };

  return (
    <SelectableList.Root 
      items={connections} 
      onEdit={handleEdit} 
      onDelete={handleDelete}
      expanderId="connections"
      emptyLabel="no connections"
    >
      <SelectableList.Header>
        <Sparkle size={12} className="mr-2" />
        Connections
      </SelectableList.Header>
      
      <SelectableList.Actions />
      
      <SelectableList.Content>
        <SelectableList.Trigger onTrigger={handleAddConnection}>
          <Plus size={12} className="mr-1" />
          Add Connection
        </SelectableList.Trigger>
      </SelectableList.Content>
    </SelectableList.Root>
  );
}

// Minimal usage without actions or trigger:
function SimpleExample() {
  const items = [
    { id: "1", label: "Item 1", subLabel: "Description 1" },
    { id: "2", label: "Item 2", subLabel: "Description 2" },
  ];

  return (
    <SelectableList.Root items={items} expanderId="simple">
      <SelectableList.Header>Simple List</SelectableList.Header>
      <SelectableList.Content />
    </SelectableList.Root>
  );
}
*/
