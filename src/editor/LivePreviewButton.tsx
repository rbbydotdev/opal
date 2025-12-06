import { Button } from "@/components/ui/button";
import { useSidebarPanes } from "@/features/live-preview/EditorSidebarLayout.jsx";
import { WindowPreviewComponent, WindowPreviewHandler } from "@/features/live-preview/PreviewComponent";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview.js";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { ExternalLink, X, Zap } from "lucide-react";
import { useRef } from "react";

export function LivePreviewButtons() {
  const { right } = useSidebarPanes();
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const extPreviewCtrl = useRef<WindowPreviewHandler>(null);

  if (!previewNode) return null;
  return (
    <>
      <div className={"flex  items-center justify-center flex-nowrap "}>
        <Button
          size="sm"
          className="active:scale-95 rounded-r-none"
          onClick={() => right.setIsCollapsed((prev) => !prev)}
          asChild
        >
          <div>
            {right.isCollapsed ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-full flex justify-center items-center border-1 ">Open Preview</div>
                <Zap size={36} className="!w-5 !h-5 stroke-primary-foreground" strokeWidth={2} />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <X size={36} className="!w-5 !h-5 stroke-primary-foreground" strokeWidth={2} />
                Close Preview
              </div>
            )}
          </div>
        </Button>

        <WindowPreviewComponent
          path={path!}
          ref={extPreviewCtrl}
          currentWorkspace={currentWorkspace}
          Closed={
            <Button
              size="sm"
              className={"active:scale-95 text-secondary rounded-l-none border-l-border"}
              onClick={extPreviewCtrl.current?.open}
              asChild
            >
              <span>
                <ExternalLink size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
              </span>
            </Button>
          }
          Open={
            <Button
              size="sm"
              className={"active:scale-95 text-secondary rounded-l-none border-l-border"}
              onClick={extPreviewCtrl.current?.close}
              asChild
            >
              <span>
                <X size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
              </span>
            </Button>
          }
        />
      </div>
    </>
  );
}
