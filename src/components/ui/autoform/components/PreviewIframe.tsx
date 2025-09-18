import { relPath } from "@/lib/paths2";
import { Loader } from "lucide-react";
import { useRef, useState } from "react";

export function PreviewIFrame({ previewURL, previewPath }: { previewURL: string; previewPath?: string | null }) {
  const [showSpinner, setShowSpinner] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="truncate w-full h-12 bg-sidebar z-10 flex justify-center text-sm py-2 font-bold gap-2">
        <span className="font-light font-mono before:content-['['] after:content-[']']">PREVIEW</span>
        {" / "}
        <span className="truncate font-mono">{relPath(previewPath!)}</span>
      </div>
      {showSpinner && (
        <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
          <div className="animate-spin animation-iteration-infinite">
            <Loader size={24} />
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        tabIndex={-1}
        src={previewURL}
        className="flex-grow bg-white"
        title="Preview"
        onLoad={() => {
          setShowSpinner(false);

          try {
            const iframeWin = iframeRef.current?.contentWindow;
            if (iframeWin) {
              iframeWin.addEventListener("keydown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Re-dispatch the event on the parent window
                const evt = new KeyboardEvent("keydown", {
                  key: e.key,
                  code: e.code,
                  ctrlKey: e.ctrlKey,
                  shiftKey: e.shiftKey,
                  altKey: e.altKey,
                  metaKey: e.metaKey,
                  bubbles: true,
                });
                window.dispatchEvent(evt);
              });
            }
          } catch (_err) {
            console.warn("Could not attach keydown listener to iframe (likely cross-origin).");
          }
        }}
      />
    </div>
  );
}
