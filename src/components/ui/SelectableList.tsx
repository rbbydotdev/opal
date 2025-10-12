import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { Check, ChevronRight, Trash2 } from "lucide-react";
import React, { ReactNode, useState } from "react";

export interface SelectableListItem {
  id: string;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  metadata?: ReactNode; // For timestamps, status indicators, etc.
}

export interface SelectableListProps {
  title: string;
  titleIcon?: ReactNode;
  items: SelectableListItem[];
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onDelete?: (id: string) => void;
  multiSelect?: boolean;
  emptyMessage?: string;
  className?: string;
  maxHeight?: string;
  showDeleteButton?: boolean;
  onAdd?: () => void;
  addButtonLabel?: string;
  addButtonIcon?: ReactNode;
  expanderId: string; // For collapsible state management
}

export function SelectableList({
  title,
  titleIcon,
  items,
  selectedIds = [],
  onSelectionChange,
  onDelete,
  multiSelect = true,
  emptyMessage = "No items found",
  className,
  maxHeight = "200px",
  showDeleteButton = false,
  onAdd,
  addButtonLabel = "Add",
  addButtonIcon,
  expanderId,
}: SelectableListProps) {
  const [expanded, setExpanded] = useSingleItemExpander(expanderId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleItemClick = (id: string) => {
    if (!onSelectionChange) return;

    let newSelection: string[];
    
    if (multiSelect) {
      if (selectedIds.includes(id)) {
        newSelection = selectedIds.filter(selectedId => selectedId !== id);
      } else {
        newSelection = [...selectedIds, id];
      }
    } else {
      newSelection = selectedIds.includes(id) ? [] : [id];
    }

    onSelectionChange(newSelection);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <SidebarGroup className={className}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <SidebarGroupLabel>
              <ChevronRight 
                size={12} 
                className="transition-transform group-data-[state=open]/collapsible:rotate-90" 
              />
              <div className="w-full">
                <div className="flex justify-center items-center">
                  {titleIcon && <span className="mr-2">{titleIcon}</span>}
                  {title}
                </div>
              </div>
            </SidebarGroupLabel>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-2">
            {onAdd && (
              <Button 
                className="w-full text-xs" 
                size="sm" 
                variant="outline"
                onClick={onAdd}
              >
                {addButtonIcon && <span className="mr-1">{addButtonIcon}</span>}
                <span className="flex-grow">{addButtonLabel}</span>
              </Button>
            )}

            {items.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                {emptyMessage}
              </div>
            ) : (
              <ScrollArea className="w-full" style={{ maxHeight }}>
                <div className="space-y-1">
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isHovered = hoveredId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`
                          relative flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                          ${isSelected 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-muted/50'
                          }
                        `}
                        onClick={() => handleItemClick(item.id)}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {/* Selection indicator */}
                        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          {isSelected && <Check size={12} />}
                        </div>

                        {/* Item icon */}
                        {item.icon && (
                          <div className="flex-shrink-0">
                            {item.icon}
                          </div>
                        )}

                        {/* Item content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.label}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        {item.metadata && (
                          <div className="flex-shrink-0 text-xs text-muted-foreground">
                            {item.metadata}
                          </div>
                        )}

                        {/* Delete button */}
                        {showDeleteButton && onDelete && isHovered && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 h-6 w-6 p-0 opacity-70 hover:opacity-100"
                            onClick={(e) => handleDelete(e, item.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {selectedIds.length > 0 && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {selectedIds.length} selected
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}