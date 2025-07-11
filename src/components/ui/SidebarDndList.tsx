// SidebarDnd.tsx
import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";
import React, { createContext, HTMLAttributes, ReactElement, ReactNode, useContext, useEffect, useState } from "react";

type SidebarDndContextType = {
  dragging: number | null;
  dragOver: number | null;
  setDragging: (i: number | null) => void;
  setDragOver: (i: number | null) => void;
  onDropItem: (from: number, to: number) => void;
  order: string[];
  showSet: Set<string> | null;
};

const SidebarDndContext = createContext<SidebarDndContextType | undefined>(undefined);

function useSidebarDndContext() {
  const ctx = useContext(SidebarDndContext);
  if (!ctx) throw new Error("SidebarDnd.Item must be used within SidebarDnd.List");
  return ctx;
}

type SidebarDndListProps = {
  children: ReactNode;
  storageKey: string;
  show?: string[] | null;
};

function SidebarDndList({ children, storageKey, show }: SidebarDndListProps) {
  const childArray = React.Children.toArray(children).filter(React.isValidElement) as ReactElement[];
  const initialOrder = childArray.map((child) => (child.props as any)["dnd-id"]);

  const [order, setOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as string[];
        return parsed
          .filter((id) => initialOrder.includes(id))
          .concat(initialOrder.filter((id) => !parsed.includes(id)));
      } catch {
        return initialOrder;
      }
    }
    return initialOrder;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(order));
  }, [order, storageKey]);

  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const showSet = show ? new Set(show) : null;

  const onDropItem = (from: number, to: number) => {
    setOrder((prev) => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, removed!);
      return newOrder;
    });
  };

  return (
    <SidebarDndContext.Provider
      value={{
        dragging,
        dragOver,
        setDragging,
        setDragOver,
        onDropItem,
        order,
        showSet,
      }}
    >
      {order.map((id, index) => {
        const child = childArray.find((c) => (c.props as any)["dnd-id"] === id);
        if (!child) return null;
        if (showSet && !showSet.has(id)) return null;
        return React.cloneElement(child, { index, key: id });
      })}
    </SidebarDndContext.Provider>
  );
}

type SidebarDndItemProps = {
  "dnd-id": string;
  asChild?: boolean;
  index?: number; // injected by List
} & HTMLAttributes<HTMLElement>;

function SidebarDndItem(props: SidebarDndItemProps) {
  const { className, children, index, onDragStart, onDragOver, onDragLeave, onDrop, asChild, ...rest } = props;
  const { dragging, dragOver, setDragging, setDragOver, onDropItem } = useSidebarDndContext();

  if (index === undefined) return null;

  const dndProps = {
    className: clsx(className, {
      "bg-sidebar-accent border border-black": dragOver === index,
    }),
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      setDragging(index);
      onDragStart?.(e);
    },
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      if (dragging === null || dragging === index) return;
      setDragOver(index);
      onDragOver?.(e);
    },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      setDragging(null);
      setDragOver(null);
      onDragLeave?.(e);
    },
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      setDragging(null);
      setDragOver(null);
      if (dragging === null || dragging === index) return;
      onDropItem(dragging, index);
      onDrop?.(e);
    },
    ...rest,
  };

  if (asChild && React.isValidElement(children)) {
    return <Slot {...dndProps}>{children}</Slot>;
  }

  // Default to div if not asChild
  return <div {...dndProps}>{children}</div>;
}

export const SidebarDnd = {
  List: SidebarDndList,
  Item: SidebarDndItem,
};
