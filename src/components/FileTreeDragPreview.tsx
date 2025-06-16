import { useFileTreeMenuContext } from "@/components/FileTreeProvider";
import { Thumb } from "@/Db/Thumb";
import { DragPreviewNode } from "@/features/filetree-drag-and-drop/DragPreviewNode";
import { isImage } from "@/lib/paths2";
import { FileIcon, FolderDownIcon } from "lucide-react";
import { forwardRef } from "react";

export const FileTreeDragPreview = forwardRef<HTMLDivElement>((_props, ref) => {
  const { draggingNodes } = useFileTreeMenuContext();
  const totalNodes = draggingNodes.length;

  // --- Tuning Knobs for the "Solitaire" Effect ---
  // How much each subsequent card rotates. Higher = wider fan.
  const ROTATION_PER_ITEM = 5;
  // How much each subsequent card moves down. Higher = longer stack.
  const Y_OFFSET_PER_ITEM = 4;
  // ---

  return (
    <DragPreviewNode ref={ref} className="grid place-items-center" style={{ gridTemplateAreas: "'stack'" }}>
      {draggingNodes.map((n, index) => {
        // This is the key calculation for the fan effect.
        // It calculates a rotation centered around 0.
        // For 3 items, rotations will be: -5deg, 0deg, 5deg.
        // For 4 items: -7.5deg, -2.5deg, 2.5deg, 7.5deg.
        const rotation = (index - (totalNodes - 1) / 2) * ROTATION_PER_ITEM;

        const yOffset = index * Y_OFFSET_PER_ITEM;

        const transformStyle = {
          gridArea: "stack",
          // The order is important: rotate first, then translate.
          // This moves the item outwards along its new rotated axis, creating an arc.
          transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
        };

        if (n.isTreeDir()) {
          return (
            <FolderDownIcon
              key={n.path}
              size={48}
              strokeWidth={1}
              className="text-ring rounded"
              fill="white"
              style={transformStyle}
            />
          );
        }
        if (isImage(n.path)) {
          return (
            <img
              key={n.path}
              src={Thumb.pathToURL(n.path)}
              alt=""
              className="w-12 h-12 object-cover rounded border border-black"
              style={transformStyle}
            />
          );
        }

        return (
          <FileIcon
            key={n.path}
            size={48}
            strokeWidth={1}
            className="text-ring rounded bg-white"
            style={transformStyle}
          />
        );
      })}
    </DragPreviewNode>
  );
});

FileTreeDragPreview.displayName = "FileTreeDragPreview";
