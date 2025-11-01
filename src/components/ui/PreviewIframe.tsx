import { PreviewComponent } from "@/app/PreviewComponent";
import { Workspace } from "@/data/Workspace";
import { AbsPath, relPath } from "@/lib/paths2";
import { ExternalLink, Loader, RefreshCw } from "lucide-react";

export function PreviewIFrame({
  previewPath,
  currentWorkspace,
}: {
  previewPath?: AbsPath | null;
  currentWorkspace: Workspace;
}) {
  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="w-full h-12 bg-sidebar z-10 flex items-center text-sm py-2 font-bold px-4">
        <button
          onClick={() => {}}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Refresh preview"
        >
          <RefreshCw size={16} />
        </button>
        <div className="flex items-center gap-2 truncate flex-1 justify-center">
          <span className="font-light font-mono before:content-['['] after:content-[']']">PREVIEW3</span>
          {" / "}
          <span className="truncate font-mono">{relPath(previewPath!)}</span>
        </div>
        <button
          onClick={() => {}}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Open preview in new window"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {false && (
        <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
          <div className="animate-spin animation-iteration-infinite">
            <Loader size={24} />
          </div>
        </div>
      )}

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

// funcion
