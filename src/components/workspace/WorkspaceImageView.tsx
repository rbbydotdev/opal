import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { ImageViewer } from "@/components/ImageViewer";
import { ROOT_NODE } from "@/components/filetree/TreeNode";
import { useCurrentFilepath } from "@/context/WorkspaceContext";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/hooks/useFileTreeDragDrop";
import { Workspace } from "@/lib/events/Workspace";
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
              targetNode: ROOT_NODE,
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
