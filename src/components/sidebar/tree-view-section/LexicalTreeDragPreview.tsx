import { LexicalTreeViewNode } from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";
import { DragPreviewNode } from "@/features/filetree-drag-and-drop/DragPreviewNode";
import { FileCode2Icon, FileTextIcon, Folder, Hash, List, Type } from "lucide-react";
import { forwardRef } from "react";

interface LexicalTreeDragPreviewProps {
  nodes: LexicalTreeViewNode[];
}

export const LexicalTreeDragPreview = forwardRef<HTMLDivElement, LexicalTreeDragPreviewProps>(
  ({ nodes }, ref) => {
    const totalNodes = nodes.length;

    // --- Tuning Knobs for the "Solitaire" Effect ---
    // How much each subsequent card rotates. Higher = wider fan.
    const ROTATION_PER_ITEM = 5;
    // How much each subsequent card moves down. Higher = longer stack.
    const Y_OFFSET_PER_ITEM = 4;
    // ---

    const count = nodes.length;

    const getNodeIcon = (node: LexicalTreeViewNode) => {
      switch (node.type) {
        case "section":
        case "heading":
          return <Hash className="w-full h-full text-blue-600" strokeWidth={1} />;
        case "list":
          return <List className="w-full h-full text-green-600" strokeWidth={1} />;
        case "paragraph":
          return <Type className="w-full h-full text-gray-600" strokeWidth={1} />;
        case "image":
          return <FileTextIcon className="w-full h-full text-purple-600" strokeWidth={1} />;
        default:
          return <FileCode2Icon className="w-full h-full text-orange-600" strokeWidth={1} />;
      }
    };

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
        {nodes.slice(0, 8).map((node, index) => {
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

          return (
            <div
              key={node.id}
              className="w-12 h-12 border-2 border-primary-foreground bg-background rounded-lg p-1"
              style={{
                ...transformStyle,
                boxShadow: "0 4px 12px 0 oklch(var(--foreground) / 0.3)",
              }}
            >
              {getNodeIcon(node)}
            </div>
          );
        })}
      </DragPreviewNode>
    );
  }
);

LexicalTreeDragPreview.displayName = "LexicalTreeDragPreview";