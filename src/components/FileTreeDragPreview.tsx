import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { Thumb } from "@/Db/Thumb";
import { DragPreviewNode } from "@/features/filetree-drag-and-drop/DragPreviewNode";
import { isImage } from "@/lib/paths2";
import { FileTextIcon, Folder } from "lucide-react";
import { forwardRef } from "react";

export const FileTreeDragPreview = forwardRef<HTMLDivElement>((_props, ref) => {
  const { draggingNodes } = useFileTreeMenuCtx();
  const totalNodes = draggingNodes.length;

  // --- Tuning Knobs for the "Solitaire" Effect ---
  // How much each subsequent card rotates. Higher = wider fan.
  const ROTATION_PER_ITEM = 5;
  // How much each subsequent card moves down. Higher = longer stack.
  const Y_OFFSET_PER_ITEM = 4;
  // ---

  const count = draggingNodes.length;
  return (
    <DragPreviewNode
      ref={ref}
      className="grid place-items-center w-36 h-36 relative border border-transparent"
      style={{ gridTemplateAreas: "'stack'" }}
    >
      {count > 1 && (
        <div className="rounded-full text-xs items-center flex justify-center z-10 w-5 h-5 bg-destructive text-destructive-foreground absolute right-8 top-10">
          {count}
        </div>
      )}
      {draggingNodes.slice(0, 8).map((treeNode, index) => {
        // This is the key calculation for the fan effect.
        // It calculates a rotation centered around 0.
        // For 3 items, rotations will be: -5deg, 0deg, 5deg.
        // For 4 items: -7.5deg, -2.5deg, 2.5deg, 7.5deg.
        const rotation = totalNodes <= 2 ? 20 + index * 8 : (index - (totalNodes - 1) / 2) * ROTATION_PER_ITEM;

        const yOffset = index * Y_OFFSET_PER_ITEM;

        const transformStyle = {
          gridArea: "stack",
          // The order is important: rotate first, then translate.
          // This moves the item outwards along its new rotated axis, creating an arc.
          transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
        };

        if (treeNode.isTreeDir()) {
          return (
            <div
              key={treeNode.path}
              className="w-12 h-12 border-2 border-primary-foreground bg-background rounded-lg"
              style={{
                ...transformStyle,
                boxShadow: "0 4px 12px 0 hsl(var(--foreground))",
              }}
            >
              <Folder fill="white" key={treeNode.path} strokeWidth={1} className="text-ring rounded w-full h-full" />
            </div>
          );
        }
        if (isImage(treeNode.path)) {
          return (
            <div
              key={treeNode.path}
              className="w-12 h-12 overflow-hidden border-2 border-primary-foreground bg-background rounded-lg"
              style={{
                ...transformStyle,
                boxShadow: "0 4px 12px 0 hsl(var(--foreground))",
              }}
            >
              <img
                //IMAGE PREVIEW BREAKS WHEN CONSOLE NO-CACHE IS ON
                src={Thumb.resolveURLFromNode(treeNode)}
                alt="preview"
                className="w-full h-full object-cover bg-background ascpect-square"
              />
            </div>
          );
        }

        return (
          <div
            key={treeNode.path}
            className="w-12 h-12 border-2 border-primary-foreground rounded-lg"
            style={{
              ...transformStyle,
              boxShadow: "0 4px 12px 0 hsl(var(--foreground))",
            }}
          >
            <FileTextIcon
              key={treeNode.path}
              strokeWidth={1}
              fill="white"
              className="text-ring rounded bg-background w-full h-full"
            />
          </div>
        );
      })}
    </DragPreviewNode>
  );
});

FileTreeDragPreview.displayName = "FileTreeDragPreview";
