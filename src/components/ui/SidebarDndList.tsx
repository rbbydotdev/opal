import clsx from "clsx";
import React, { useEffect, useState } from "react";

type SidebarDndListChildProps = React.HTMLAttributes<HTMLDivElement> & {
  onDrop?: React.DragEventHandler;
  "dnd-id": string;
  className?: string;
};

export function SidebarDndList({
  children,
  storageKey,
}: {
  children: React.ReactElement<SidebarDndListChildProps> | React.ReactElement<SidebarDndListChildProps>[];
  storageKey: string;
}) {
  const initialChildren = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => child as React.ReactElement<SidebarDndListChildProps>);
  const initialOrder = initialChildren.map((child) => child.props["dnd-id"]);

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

  // Always use latest children
  const idToChild = Object.fromEntries(initialChildren.map((child) => [child.props["dnd-id"], child]));

  return order.map((id, index) => {
    const child = idToChild[id];
    if (!child) return null;
    return React.cloneElement(child, {
      key: id,
      className: clsx(child.props.className, "flex-shrink flex", {
        "bg-sidebar-accent border border-black": dragOver === index,
      }),
      draggable: true,
      onDragStart: (e: React.DragEvent<HTMLDivElement>) => {
        setDragging(index);
        child.props.onDragStart?.(e);
      },
      onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (dragging !== null) setDragOver(index);
        child.props.onDragOver?.(e);
      },
      onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
        setDragOver(null);
        child.props.onDragLeave?.(e);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragging === null || dragging === index) return;
        setOrder((prev) => {
          const newOrder = [...prev];
          const [removed] = newOrder.splice(dragging, 1);
          newOrder.splice(index, 0, removed);
          return newOrder;
        });
        setDragging(null);
        setDragOver(null);
        child.props.onDrop?.(e);
      },
    });
  });
}
