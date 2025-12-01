import { useConfirm } from "@/components/Confirm";
import { SidebarGripChevron } from "@/components/SidebarFileMenu/build-section/SidebarGripChevron";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
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

type SelectableListContextValue<T = any> = {
  items: SelectableItem[];
  data?: T[];
  getItemId?: (item: T) => string;
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
  setChildItemIds: (ids: string[]) => void;
};

const SelectableListContext = createContext<SelectableListContextValue | null>(null);

const useSelectableListContext = () => {
  const context = useContext(SelectableListContext);
  if (!context) {
    throw new Error("SelectableList compound components must be used within SelectableListRoot");
  }
  return context;
};

type SelectableListRootProps<T = any> = {
  children: React.ReactNode;
  items?: SelectableItem[];
  data?: T[];
  getItemId?: (item: T) => string;
  onClick?: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
  expanderId: string;
  showGrip?: boolean;
};

export function SelectableListCore<T = any>({
  children,
  items = [],
  data,
  getItemId,
  onClick,
  onDelete,
  emptyLabel = "no items",
  showGrip = true,
}: {
  children: React.ReactNode;
  items?: SelectableItem[];
  data?: T[];
  getItemId?: (item: T) => string;
  onClick?: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
  showGrip?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [childItemIds, setChildItemIds] = useState<string[]>([]);

  // Derive allItemIds from: 1) data prop, 2) items prop, 3) children IDs
  const allItemIds =
    data && getItemId ? data.map(getItemId) : items.length > 0 ? items.map((item) => item.id) : childItemIds;

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
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected.length) return setSelected([]);
    };
    sectionRef.current.addEventListener("keydown", handleKeydown, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [allItemIds, onClick, sectionRef, selected, selected.length]);

  const contextValue: SelectableListContextValue<T> = {
    items,
    data,
    getItemId,
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
    setChildItemIds,
  };

  return (
    <SelectableListContext.Provider value={contextValue}>
      <div ref={sectionRef} tabIndex={-1}>
        {children}
      </div>
    </SelectableListContext.Provider>
  );
}

export function SelectableListSimple<T = any>(props: {
  children: React.ReactNode;
  items?: SelectableItem[];
  data: T[];
  getItemId: (item: T) => string;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
  showGrip?: boolean;
}) {
  return (
    <SelectableListCore {...props}>
      <SidebarGroup className="pl-0 py-0">{props.children}</SidebarGroup>
    </SelectableListCore>
  );
}

// Collapsible version using expanderId
export function SelectableListRoot<T = any>({ children, expanderId, ...coreProps }: SelectableListRootProps<T>) {
  const [expanded, setExpand] = useSingleItemExpander(expanderId);

  return (
    <SelectableListCore {...coreProps}>
      <SidebarGroup className="pl-0 py-0">
        <Collapsible className="group/selectablelist flex flex-col min-h-0" open={expanded} onOpenChange={setExpand}>
          {children}
        </Collapsible>
      </SidebarGroup>
    </SelectableListCore>
  );
}

export function SelectableListActions({ children }: { children?: React.ReactNode }) {
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
    <div className="group-data-[state=closed]/selectablelist:hidden ">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarGroupAction className={cn("p-0 top-1.5 z-10", children ? "right-0" : "right-0")} title="Items Menu">
            <Ellipsis /> <span className="sr-only">Items Menu</span>
          </SidebarGroupAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {children}
          <DropdownMenuSeparator />
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

export function SelectableListHeader({ children }: { children: React.ReactNode }) {
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

// Basic list items wrapper (non-collapsible)
export function SelectableListItems({ children }: { children?: React.ReactNode }) {
  const { emptyLabel, items, data, setChildItemIds } = useSelectableListContext();

  const childrenCount = React.Children.count(children);
  const hasData = (data && data.length > 0) || items.length > 0;

  // Extract child item IDs only when no data or items are provided
  React.useEffect(() => {
    if (!hasData) {
      const itemIds: string[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === SelectableListItem) {
          itemIds.push((child.props as any).id);
        }
      });
      setChildItemIds(itemIds);
    }
  }, [children, setChildItemIds, hasData]);

  return (
    <SidebarMenu>
      {childrenCount === 0 && !hasData && (
        <div className="px-4 py-2">
          <EmptySidebarLabel label={emptyLabel} />
        </div>
      )}
      {children}
    </SidebarMenu>
  );
}

// Collapsible content wrapper
export function SelectableListContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <CollapsibleContent className={className}>
      <SelectableListItems>{children}</SelectableListItems>
    </CollapsibleContent>
  );
}

type SelectableListMapProps<T> = {
  map: (item: T) => React.ReactNode;
};

export function SelectableListMap<T>({ map }: SelectableListMapProps<T>) {
  const { data, getItemId } = useSelectableListContext();

  if (!data || !getItemId) {
    console.warn("SelectableList.Map requires data and getItemId to be provided in SelectableListRoot");
    return null;
  }

  return <>{data.map(map)}</>;
}

type SelectableListTriggerProps = {
  children: React.ReactNode;
  onTrigger?: () => void;
};

export function SelectableListTrigger({ children, onTrigger }: SelectableListTriggerProps) {
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

export function SelectableListActionButton({ children, onClick, title, className }: SelectableListActionButtonProps) {
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

export function SelectableListItem({ children, id }: SelectableListItemProps) {
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
    <ContextMenu>
      <ContextMenuTrigger>
        <SidebarMenuItem
          tabIndex={-1}
          data-selectable-id={id}
          className="flex w-full rounded justify-center items-center relative"
        >
          {/* <div className="flex items-center pr-1 py-2 hover:bg-sidebar-accent"> */}
          <SidebarMenuButton
            className="flex-1 min-w-0 group h-full py-1"
            onClick={(e) => handleSelect(sectionRef, e, id)}
          >
            <div className="flex items-center flex-1 min-w-0 gap-1 text-xs ml-[0.17rem]">
              <div className="w-4 h-4 flex justify-center items-center mr-0.5 shrink-0">
                {isSelected(id) && <Check className="w-3 h-3 rounded-full " />}
              </div>
              {otherChildren}
            </div>
          </SidebarMenuButton>
          {menuChild}
          {/* </div> */}
        </SidebarMenuItem>
      </ContextMenuTrigger>
      <ContextMenuContent>{menuChild}</ContextMenuContent>
    </ContextMenu>
  );
}

export function SelectableListItemIcon({ children }: { children: React.ReactNode }) {
  return <div className="flex-shrink-0">{children}</div>;
}

export function SelectableListItemLabel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div
      title={title}
      className="max-w-[32ch] font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-shrink ml-1"
    >
      {children}
    </div>
  );
}

export function SelectableListItemSubLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-shrink-0 text-xs">{"/"}</div>
      <div className="text-xs text-muted-foreground capitalize font-mono overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
    </>
  );
}

export function SelectableListItemMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-4.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2"
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

export function SelectableListItemAction({ children, onClick, icon, destructive }: SelectableListItemActionProps) {
  return (
    <DropdownMenuItem onClick={onClick} className={destructive ? "text-destructive" : ""}>
      {icon && <div className="w-4 h-4 mr-2">{icon}</div>}
      {children}
    </DropdownMenuItem>
  );
}
