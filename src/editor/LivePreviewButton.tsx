import { Button } from "@/components/ui/button";
import { useLivePreview } from "@/features/live-preview/useLivePreview";
import { useResolvePathForPreview } from "@/features/live-preview/useResolvePathForPreview";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout.jsx";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { ExternalLink, Printer, X, Zap } from "lucide-react";

export function LivePreviewButtons() {
  const { right } = useSidebarPanes();

  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const { previewNode } = useResolvePathForPreview({ path, currentWorkspace });
  const {
    extPreviewCtrl,
    isOpen,
    handlePrintClick,
    openPreview,
    closePreview,
  } = useLivePreview();

  if (!previewNode) return null;
  return (
    <>
      <div className={"flex items-center justify-center flex-nowrap"}>
        <Button size="sm" className="rounded-r-none" onClick={() => right.setIsCollapsed((prev) => !prev)} asChild>
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

        <Button size="sm" className="rounded-l-none rounded-r-none" onClick={handlePrintClick}>
          Print <Printer className="stroke-primary-foreground flex-shrink !w-4 !h-4" />
        </Button>
        {!isOpen ? (
          <Button
            size="sm"
            className={"text-secondary rounded-l-none border-l-border"}
            onClick={openPreview}
            asChild
          >
            <span>
              <ExternalLink size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
            </span>
          </Button>
        ) : (
          <Button
            size="sm"
            className={"active:scale-95 text-secondary rounded-l-none border-l-border"}
            onClick={closePreview}
            asChild
          >
            <span>
              <X size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
            </span>
          </Button>
        )}
      </div>
    </>
  );
}
