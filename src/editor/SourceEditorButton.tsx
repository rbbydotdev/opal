import { Button } from "@/components/ui/button";
import { setViewMode } from "@/editor/view-mode/handleUrlParamViewMode";
import { ChevronRightIcon, FileText } from "lucide-react";

export const SourceEditorButton = () => (
  <Button variant="outline" onClick={() => setViewMode("source", "hash")}>
    <span className="text-xs flex justify-center items-center gap-1">
      Source
      <FileText size={12} />
      <ChevronRightIcon size={12} />
    </span>
  </Button>
);
