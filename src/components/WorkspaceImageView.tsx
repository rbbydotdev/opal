import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { ImageViewer } from "@/components/ImageViewer";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { useNavigate } from "@tanstack/react-router";

export function WorkspaceImageView({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { isImage, filePath } = useCurrentFilepath();

  const navigate = useNavigate();
  if (isImage) {
    return (
      <>
        <ConditionalDropzone
          shouldActivate={isExternalFileDrop}
          onDrop={(e) =>
            handleDropFilesEventForNode({
              currentWorkspace: currentWorkspace,
              event: e,
              targetNode: RootNode,
            }).then(([filePath]) => {
              if (filePath) return navigate({ to: currentWorkspace.resolveFileUrl(filePath) });
            })
          }
        >
          <ImageViewer alt={filePath ?? ""} origSrc={filePath ?? ""} />
        </ConditionalDropzone>
      </>
    );
  }
}
