import { SelectableItem } from "@/components/selectable-list/SelectableList";
import React, { createContext, useContext } from "react";

export type SelectableListContextValue<T = any> = {
  items: SelectableItem[];
  data?: T[];
  getItemId?: (item: T) => string;
  selected: string[];
  isSelected: (id: string) => boolean;
  toggleSelected: (id: string) => void;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  handleSelect: (sectionRef: React.RefObject<HTMLDivElement | null>, event: React.MouseEvent, id: string) => void;
  onClick?: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
  showGrip?: boolean;
  allItemIds: string[];
  setChildItemIds: (ids: string[]) => void;
};
export const SelectableListContext = createContext<SelectableListContextValue | null>(null);
// Context for the current item being rendered
export type SelectableListItemContextValue<T = any> = {
  itemId: string;
  itemData?: T;
};
export const SelectableListItemContext = createContext<SelectableListItemContextValue | null>(null);
export const useSelectableListContext = () => {
  const context = useContext(SelectableListContext);
  if (!context) {
    throw new Error("SelectableList compound components must be used within SelectableListRoot");
  }
  return context;
};
export const useSelectableListItemContext = () => {
  const context = useContext(SelectableListItemContext);
  if (!context) {
    throw new Error("SelectableListItemAction must be used within SelectableListItem");
  }
  return context;
};
