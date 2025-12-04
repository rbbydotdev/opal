import { ViewModeParamType } from "@/editor/view-mode/handleUrlParamViewMode";
import { useUrlParam } from "@/hooks/useUrlParam";
import { ViewMode } from "@mdxeditor/editor";

export function useWatchViewMode(watch: ViewModeParamType = "hash+search"): ViewMode | null {
  const [viewMode] = useUrlParam({
    key: "viewMode",
    paramType: watch,
    parser: (rawValue) => {
      if (!rawValue) return null;

      try {
        // Handle both quoted and unquoted values
        const viewMode = rawValue.includes('"') ? JSON.parse(rawValue) : rawValue;
        const validModes: Array<ViewMode> = ["rich-text", "source", "diff"];
        return validModes.find((vm) => vm === viewMode) || null;
      } catch (_e) {
        return null;
      }
    },
    serializer: (value) => value || "",
  });

  return viewMode;
}
