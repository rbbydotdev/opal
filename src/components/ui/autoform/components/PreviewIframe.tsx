import { relPath } from "@/lib/paths2";
import { Loader } from "lucide-react";
import { useState } from "react";

export function PreviewIFrame({ previewURL, previewPath }: { previewURL: string; previewPath?: string | null }) {
  const [showSpinner, setShowSpinner] = useState(true);
  return (
    <div className="relative w-full h-full flex-col">
      <div className="absolute truncate w-full h-8 bg-sidebar z-10 flex justify-center text-sm py-2 font-bold gap-2">
        <span className="font-light font-mono">[ PREVIEW ]</span>
        {" / "}
        <span className="truncate font-mono">{relPath(previewPath!)}</span>
      </div>
      <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
        {showSpinner && (
          <div className="animate-spin animation-iteration-infinite">
            <Loader size={24} />
          </div>
        )}
      </div>
      <iframe
        src={previewURL}
        className="border-0 absolute inset-0 w-full h-full top-8"
        title="Preview"
        onLoad={() => setShowSpinner(false)}
      />
    </div>
  );
}
