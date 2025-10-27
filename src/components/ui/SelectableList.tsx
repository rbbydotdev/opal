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
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Delete, Ellipsis, MoreHorizontal, SquareDashed } from "lucide-react";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export type SelectableItem = {
  id: string;
  ItemComponent: React.ComponentType<{ id: string; isSelected: boolean }>;
};

type SelectableListContextValue = {
  items: SelectableItem[];
  selected: string[];
  isSelected: (id: string) => boolean;
  toggleSelected: (id: string) => void;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  handleSelect: (sectionRef: React.RefObject<HTMLDivElement | null>, event: React.MouseEvent, id: string) => void;
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyLabel?: string;
  showGrip?: boolean;
  allItemIds: string[];
  setAllItemIds: (ids: string[]) => void;
};

const SelectableListContext = createContext<SelectableListContextValue | null>(null);

const useSelectableListContext = () => {
  const context = useContext(SelectableListContext);
  if (!context) {
    throw new Error("SelectableList compound components must be used within SelectableList.Root");
  }
  return context;
};

type SelectableListRootProps = {
  children: React.ReactNode;
  items?: SelectableItem[];
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyLabel?: string;
  expanderId: string;
  showGrip?: boolean;
};

function SelectableListRoot({
  children,
  items = [],
  onClick,
  onDelete,
  emptyLabel = "no items",
  expanderId,
  showGrip = true,
}: SelectableListRootProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [allItemIds, setAllItemIds] = useState<string[]>([]);
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
      onClick?.(id);
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
    onClick,
    onDelete,
    emptyLabel,
    showGrip,
    allItemIds,
    setAllItemIds,
  };

  const [expanded, setExpand] = useSingleItemExpander(expanderId);

  return (
    <SelectableListContext.Provider value={contextValue}>
      <SidebarGroup className="pl-0 py-0">
        <Collapsible className="group/selectablelist flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
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
  const { selected, setSelected, onDelete, allItemIds } = useSelectableListContext();
  const { open: openConfirm } = useConfirm();

  const handleDeleteAll = () => {
    return !onDelete
      ? null
      : openConfirm(
          () => {
            selected.forEach((id) => onDelete(id));
            setSelected([]);
          },
          "Delete Items",
          `Are you sure you want to delete ${selected.length} item(s)? This action cannot be undone.`
        );
  };

  return (
    <div className="group-data-[state=closed]/selectablelist:hidden">
      {/* Custom action buttons (like Add button) */}
      {children}

      {/* Dropdown menu for bulk actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {allItemIds.length > 0 && (
            <SidebarGroupAction className={cn("top-1.5 p-0", children ? "right-0" : "right-0")} title="Items Menu">
              <Ellipsis /> <span className="sr-only">Items Menu</span>
            </SidebarGroupAction>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setSelected(allItemIds)}
            className="grid grid-cols-[auto_1fr] items-center gap-2"
            disabled={allItemIds.length === selected.length}
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
  const { showGrip } = useSelectableListContext();

  return (
    <CollapsibleTrigger asChild>
      <SidebarMenuButton className="pl-0">
        <SidebarGroupLabel className="pl-2">
          {showGrip ? (
            <SidebarGripChevron />
          ) : (
            <ChevronRight
              size={14}
              className="transition-transform duration-100 group-data-[state=open]/selectablelist:rotate-90 group-data-[state=closed]/selectablelist:rotate-0"
            />
          )}
          <div className="w-full">
            <div className="w-full flex justify-center items-center">{children}</div>
          </div>
        </SidebarGroupLabel>
      </SidebarMenuButton>
    </CollapsibleTrigger>
  );
}

function SelectableListContent({ children }: { children?: React.ReactNode }) {
  const { emptyLabel, setAllItemIds } = useSelectableListContext();

  const childrenCount = React.Children.count(children);

  // Extract item IDs from children and update context
  React.useEffect(() => {
    const itemIds: string[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === SelectableListItem) {
        itemIds.push(child.props.id);
      }
    });
    setAllItemIds(itemIds);
  }, [children, setAllItemIds]);

  return (
    <CollapsibleContent>
      <SidebarMenu>
        {childrenCount === 0 && (
          <div className="px-4 py-2">
            <EmptySidebarLabel label={emptyLabel} />
          </div>
        )}
        {children}
      </SidebarMenu>
    </CollapsibleContent>
  );
}

type SelectableListTriggerProps = {
  children: React.ReactNode;
  onTrigger?: () => void;
};

function SelectableListTrigger({ children, onTrigger }: SelectableListTriggerProps) {
  return (
    <Button variant="outline" size="sm" className="w-full mb-2" onClick={onTrigger}>
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

type SelectableListItemProps = {
  children: React.ReactNode;
  id: string;
};

function SelectableListItem({ children, id }: SelectableListItemProps) {
  const { isSelected, handleSelect } = useSelectableListContext();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // Separate menu from other children
  const menuChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === SelectableListItemMenu
  );
  const otherChildren = React.Children.toArray(children).filter(
    (child) => !React.isValidElement(child) || child.type !== SelectableListItemMenu
  );

  return (
    <SidebarMenuItem>
      <div className="group flex items-center pr-1 py-0">
        <SidebarMenuButton className="flex-1 min-w-0 pl-4" onClick={(e) => handleSelect(sectionRef, e, id)}>
          <div className="flex items-center flex-1 min-w-0 gap-1 text-xs ml-[0.17rem]">
            <div className="w-4 h-4 flex justify-center items-center mr-0.5 shrink-0">
              {isSelected(id) && <Check className="w-3 h-3 rounded-full _border" />}
            </div>
            {otherChildren}
          </div>
        </SidebarMenuButton>
        {menuChild}
      </div>
    </SidebarMenuItem>
  );
}

function SelectableListItemIcon({ children }: { children: React.ReactNode }) {
  return <div className="flex-shrink-0">{children}</div>;
}

function SelectableListItemLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[32ch] font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink ml-1">
      {children}
    </div>
  );
}

function SelectableListItemSubLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-shrink-0 text-xs">{"/"}</div>
      <div className="text-xs text-muted-foreground capitalize font-mono overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
    </>
  );
}

function SelectableListItemMenu({ children }: { children: React.ReactNode }) {
  return (
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
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

type SelectableListItemActionProps = {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
};

function SelectableListItemAction({ children, onClick, icon, destructive }: SelectableListItemActionProps) {
  return (
    <DropdownMenuItem onClick={onClick} className={destructive ? "text-destructive" : ""}>
      {icon && <div className="w-4 h-4 mr-2">{icon}</div>}
      {children}
    </DropdownMenuItem>
  );
}

// <SelectableList
export const SelectableList = {
  Root: SelectableListRoot, // <SelectableList.Root>
  Header: SelectableListHeader, // <SelectableList.Header>
  Actions: SelectableListActions, // <SelectableList.Actions>
  ActionButton: SelectableListActionButton, // <SelectableList.ActionButton>
  Content: SelectableListContent, // <SelectableList.Content>
  Trigger: SelectableListTrigger, // <SelectableList.Trigger>
  Item: SelectableListItem, // <SelectableList.Item>
  ItemIcon: SelectableListItemIcon, // <SelectableList.ItemIcon>
  ItemLabel: SelectableListItemLabel, // <SelectableList.ItemLabel>
  ItemSubLabel: SelectableListItemSubLabel, // <SelectableList.ItemSubLabel>
  ItemMenu: SelectableListItemMenu, // <SelectableList.ItemMenu>
  ItemAction: SelectableListItemAction, // <SelectableList.ItemAction>
};

// Example Usage:
/*
import { Github, Sparkle, Plus, Archive, Calendar } from "lucide-react";

// Example 1: Using Icon/label/subLabel (backward compatible)
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
      showGrip={true} // Default: true for draggable sections
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

// Example 2: Using custom ItemComponent for full flexibility
function CustomBuildsExample() {
  const BuildItemComponent = ({ id, isSelected }: { id: string; isSelected: boolean }) => {
    const build = builds.find(b => b.guid === id);
    if (!build) return null;
    
    return (
      <>
        <Archive size={12} className="flex-shrink-0 text-blue-500" />
        <div className="flex flex-col min-w-0 ml-1">
          <div className="font-medium text-xs truncate">{build.label}</div>
          <div className="flex items-center gap-1 text-2xs text-muted-foreground">
            <Calendar size={8} />
            <span>{timeAgo(build.timestamp)}</span>
            <span>•</span>
            <span>Disk: {build.diskId.slice(-8)}</span>
          </div>
        </div>
        {isSelected && <Check className="w-3 h-3 ml-auto text-green-500" />}
      </>
    );
  };

  const builds = [
    { id: "1", ItemComponent: BuildItemComponent },
    { id: "2", ItemComponent: BuildItemComponent },
  ];

  return (
    <SelectableList.Root items={builds} expanderId="builds" showGrip={false}>
      <SelectableList.Header>
        <Archive size={12} className="mr-2" />
        Custom Builds
      </SelectableList.Header>
      <SelectableList.Actions />
      <SelectableList.Content />
    </SelectableList.Root>
  );
}

// Example 3: Minimal usage (backward compatible)
function SimpleExample() {
  const items = [
    { id: "1", label: "Item 1", subLabel: "Description 1" },
    { id: "2", label: "Item 2", subLabel: "Description 2" },
  ];

  return (
    <SelectableList.Root items={items} expanderId="simple" showGrip={false}>
      <SelectableList.Header>Simple List</SelectableList.Header>
      <SelectableList.Content />
    </SelectableList.Root>
  );
}
*/
