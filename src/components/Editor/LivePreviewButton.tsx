import { useSidebarPanes } from "@/app/EditorSidebarLayout";
import { useWorkspacePathPreviewURL } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useResolvePathForPreview } from "@/lib/useResolvePathForPreview";
import { Link } from "@tanstack/react-router";
import { SquareArrowUpRightIcon, X, Zap } from "lucide-react";

export function LivePreviewButtons() {
  const { right } = useSidebarPanes();
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const previewNode = useResolvePathForPreview({ path, currentWorkspace });

  const previewURL = useWorkspacePathPreviewURL(previewNode?.path);
  return (
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
              <div className="h-full flex justify-center items-center border-1 ">Open Preview</div>{" "}
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
      <Button size="sm" className={"active:scale-95 text-secondary rounded-l-none border-l-border "} asChild>
        <Link to={previewURL!} target="_blank" rel="noopener noreferrer">
          <span>
            <SquareArrowUpRightIcon size={32} className="!text-primary-foreground  !w-5 !h-5" strokeWidth={1} />
          </span>
        </Link>
      </Button>
    </div>
  );
}
//  to={previewURL!} target="_blank"
