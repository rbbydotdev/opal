import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Delete, Undo } from "lucide-react";
import { useRef } from "react";
export const TrashFileTreeContextMenu = ({
  children,
  untrash,
  remove,
}: {
  untrash: () => void;
  remove: () => void;
  children: React.ReactNode;
}) => {
  const fnRef = useRef<null | (() => void)>(null);
  const deferredFn = (fn: () => void) => {
    return () => (fnRef.current = fn);
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className="w-52"
        onCloseAutoFocus={(event) => {
          if (fnRef.current) {
            event.preventDefault();
            fnRef.current();
            fnRef.current = null;
          }
        }}
      >
        <ContextMenuItem inset onClick={deferredFn(() => untrash())}>
          <Undo className="mr-3 h-4 w-4" />
          Put Back
        </ContextMenuItem>
        <ContextMenuItem inset onClick={deferredFn(() => remove())}>
          <Delete className="mr-3 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
