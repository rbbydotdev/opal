import { Button } from "@/components/ui/button";
import { useWatchViewMode } from "@/editors/view-mode/useWatchViewMode";
import { ChevronRightIcon, FileText } from "lucide-react";

export const SourceEditorButton = () => {
  const [, setViewMode] = useWatchViewMode();

  return (
    <Button variant="outline" onClick={() => setViewMode("source")}>
      <span className="text-xs flex justify-center items-center gap-1">
        Source
        <FileText size={12} />
        <ChevronRightIcon size={12} />
      </span>
    </Button>
  );
};
