import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
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

  // const count = reduceLineage(draggingNodes.map((n) => n.path)).length;
  const count = draggingNodes.length;
  return (
    <DragPreviewNode
      ref={ref}
      className="grid place-items-center relative w-24 h-24"
      style={{ gridTemplateAreas: "'stack'" }}
    >
      {count > 1 && (
        <div className="rounded-full flex justify-center z-10 w-6 h-6 bg-red-500 text-white absolute right-1 top-3">
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
              className="p-1 border-2 border-foreground/80 bg-background rounded-lg"
              style={{
                ...transformStyle,
                boxShadow: "0 4px 12px 0 hsl(var(--foreground))",
              }}
            >
              <Folder key={treeNode.path} size={48} strokeWidth={1} className="text-ring rounded" fill="white" />
            </div>
          );
        }
        if (isImage(treeNode.path)) {
          return (
            <div
              key={treeNode.path}
              className="p-1 border-2 border-foreground/80 bg-background rounded-lg"
              style={{
                ...transformStyle,
                boxShadow: "0 4px 12px 0 hsl(var(--foreground))",
              }}
            >
              <img
                src={Thumb.resolveURLFromNode(treeNode)}
                alt=""
                className="w-12 h-12 object-cover rounded border border-black bg-background"
              />
            </div>
          );
        }

        return (
          <div
            key={treeNode.path}
            className="p-1 border-2 border-foreground/80 bg-background rounded-lg"
            style={{
              ...transformStyle,
              boxShadow: "0 4px 12px 0 hsl(var(--foreground))",
            }}
          >
            <FileTextIcon
              key={treeNode.path}
              size={48}
              strokeWidth={1}
              fill="white"
              className="text-ring rounded bg-white"
            />
          </div>
        );
      })}
    </DragPreviewNode>
  );
});

FileTreeDragPreview.displayName = "FileTreeDragPreview";
