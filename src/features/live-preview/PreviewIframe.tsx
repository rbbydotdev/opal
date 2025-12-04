import { TreeNode } from "@/components/filetree/TreeNode";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PreviewComponent } from "@/features/live-preview/PreviewComponent";
import { AbsPath, relPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { RefreshCw } from "lucide-react";

export function PreviewIFrame({
  previewPath,
  currentWorkspace,
  refresh,
  setPreviewNode,
}: {
  previewPath?: AbsPath | null;
  currentWorkspace: Workspace;
  refresh: () => void;
  setPreviewNode: (node: TreeNode | null) => void;
}) {
  const node = currentWorkspace.nodeFromPath(previewPath)!;
  const siblings = [...(node.siblings((node) => node.isPreviewable()) || []), node];
  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="w-full h-12 bg-sidebar z-10 flex items-center text-sm py-2 font-bold px-4">
        <button
          onClick={refresh}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Refresh preview"
        >
          <RefreshCw size={16} />
        </button>
        <div className="flex items-center gap-2 truncate flex-1 justify-center">
          <span className="font-light font-mono before:content-['['] after:content-[']'] mr-3">PREVIEW</span>
          {" / "}
          <Select
            key={previewPath}
            onValueChange={(value) => setPreviewNode(currentWorkspace.nodeFromPath(value))}
            defaultValue={node.path}
          >
            <SelectTrigger className="w-auto min-w-[100px] font-mono !border-0 !outline-0 truncate">
              <SelectValue placeholder={relPath(node.path)} />
            </SelectTrigger>
            <SelectContent>
              {siblings.map((sibling) => (
                <SelectItem key={sibling.path} value={sibling.path}>
                  {relPath(sibling.path)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-grow relative">
        {!previewPath ? (
          <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background text-muted-foreground">
            No preview available
          </div>
        ) : (
          <PreviewComponent currentWorkspace={currentWorkspace} path={previewPath} />
        )}
      </div>
    </div>
  );
}
