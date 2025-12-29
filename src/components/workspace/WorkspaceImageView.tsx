import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { ImageViewer } from "@/components/ImageViewer";
import { ROOT_NODE } from "@/components/filetree/TreeNode";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/hooks/useFileTreeDragDrop";
import { Workspace } from "@/workspace/Workspace";
import { useCurrentFilepath } from "@/workspace/WorkspaceContext";
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
              if (filePath) return navigate({ to: currentWorkspace.resolveFileUrl(filePath).toString() });
            })
          }
        >
          <ImageViewer alt={filePath ?? ""} origSrc={filePath ?? ""} />
        </ConditionalDropzone>
      </>
    );
  }
}
