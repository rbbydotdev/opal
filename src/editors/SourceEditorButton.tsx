import { Button } from "@/components/ui/button";
import { useWatchViewMode } from "@/editors/view-mode/useWatchViewMode";
import { IS_MAC } from "@/lib/isMac";
import { ChevronRightIcon, FileText } from "lucide-react";

export const SourceEditorButton = () => {
  const [, setViewMode] = useWatchViewMode();

  return (
    <Button variant="outline" size="sm" onClick={() => setViewMode("source")} title={`${IS_MAC ? "cmd" : "ctrl"} + ;`}>
      <span className="text-xs flex justify-center items-center gap-1">
        Source
        <FileText size={12} />
        <ChevronRightIcon size={12} />
      </span>
    </Button>
  );
};
