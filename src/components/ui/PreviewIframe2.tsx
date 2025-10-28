import { relPath } from "@/lib/paths2";
import { Loader, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { PreviewComponent2 } from "@/app/PreviewComponent2";

export function PreviewIFrame2({ previewPath }: { previewPath?: string | null }) {
  const [showSpinner, setShowSpinner] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setShowSpinner(true);
    setRefreshKey(prev => prev + 1);
    // Give a small delay to show the spinner
    setTimeout(() => setShowSpinner(false), 300);
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="w-full h-12 bg-sidebar z-10 flex items-center text-sm py-2 font-bold px-4">
        <button
          onClick={handleRefresh}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Refresh preview"
        >
          <RefreshCw size={16} />
        </button>
        <div className="flex items-center gap-2 truncate flex-1 justify-center">
          <span className="font-light font-mono before:content-['['] after:content-[']']">PREVIEW2</span>
          {" / "}
          <span className="truncate font-mono">{relPath(previewPath!)}</span>
        </div>
        <div className="w-8 h-8"></div>
      </div>
      
      {showSpinner && (
        <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
          <div className="animate-spin animation-iteration-infinite">
            <Loader size={24} />
          </div>
        </div>
      )}

      <div key={refreshKey} className="flex-grow relative">
        <PreviewComponent2 />
      </div>
    </div>
  );
}