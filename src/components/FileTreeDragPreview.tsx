import { useFileTreeMenuContext } from "@/components/FileTreeProvider";
import { Thumb } from "@/Db/Thumb";
import { DragPreviewNode } from "@/features/filetree-drag-and-drop/DragPreviewNode";
import { isImage } from "@/lib/paths2";
import { FileIcon, FolderDownIcon } from "lucide-react";
import { forwardRef } from "react";

// {draggingNodes.map((n, index) =>{

// }}
export const FileTreeDragPreview = forwardRef<HTMLDivElement>((_props, ref) => {
  const { draggingNodes } = useFileTreeMenuContext();

  return (
    // The parent needs to define the grid area(s).
    // We define a single area called "stack".
    <DragPreviewNode ref={ref} className="_w-28 _h-20 grid place-items-center" style={{ gridTemplateAreas: "'stack'" }}>
      {draggingNodes.map((n, index) => {
        if (n.isTreeDir()) {
          return (
            <FolderDownIcon
              key={n.path}
              size={48}
              strokeWidth={1}
              className="text-ring rounded bg-white"
              style={{
                gridArea: "stack",
                transform: `rotate(${(index * 6) % 32}deg) translateX(${index * 6}px)`,
              }}
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
              style={{
                gridArea: "stack",
                transform: `rotate(${(index * 6) % 32}deg) translateX(${index * 6}px)`,
              }}
            />
          );
        }

        return (
          <FileIcon
            key={n.path}
            size={48}
            strokeWidth={1}
            className="text-ring rounded bg-white"
            style={{
              gridArea: "stack",
              transform: `rotate(${(index * 6) % 32}deg) translateX(${index * 6}px)`,
            }}
          />
        );
      })}
    </DragPreviewNode>
  );
});

FileTreeDragPreview.displayName = "FileTreeDragPreview";
// {
//   draggingNodes.map((n, index) =>
//     n.isTreeDir() ? (
//       <FolderDownIcon
//         key={n.path}
//         size={48}
//         strokeWidth={1}
//         className="text-ring rounded bg-white"
//         style={{
//           gridArea: "stack",
//           transform: `rotate(${(index * 6) % 32}deg) translateX(${index * 6}px)`,
//         }}
//       />
//     ) : isImage(n.path) ? (
//       <FileIcon
//         key={n.path}
//         size={48}
//         strokeWidth={1}
//         className="text-ring rounded bg-white"
//         style={{
//           gridArea: "stack",
//           transform: `rotate(${(index * 6) % 32}deg) translateX(${index * 6}px)`,
//         }}
//       />
//     ) : (
//       <img
//         key={n.path}
//         src={n.path}
//         alt=""
//         className="w-12 h-12 object-cover rounded border border-black"
//         style={{
//           gridArea: "stack",
//           transform: `rotate(${(index * 6) % 32}deg) translateX(${index * 6}px)`,
//         }}
//       />
//     )
//   );
// }
