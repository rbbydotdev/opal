import { Loader } from "lucide-react";
import { useState } from "react";

export function PreviewIFrame({ previewURL }: { previewURL: string }) {
  const [showSpinner, setShowSpinner] = useState(true);
  return (
    <div className="relative w-full h-full flex">
      <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
        {showSpinner && (
          <div className="animate-spin animation-iteration-infinite">
            <Loader size={24} />
          </div>
        )}
      </div>
      <iframe
        src={previewURL}
        className="border-0 absolute inset-0 w-full h-full"
        title="Preview"
        onLoad={() => setShowSpinner(false)}
      />
    </div>
  );
}
