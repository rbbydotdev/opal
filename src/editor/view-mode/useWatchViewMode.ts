import { useQueryState } from "nuqs";
import { ViewMode } from "@mdxeditor/editor";

const viewModeParser = {
  parse: (value: string): ViewMode | null => {
    const validModes: Array<ViewMode> = ["rich-text", "source", "diff"];
    return validModes.find((vm) => vm === value) || null;
  },
  serialize: (value: ViewMode | null): string => value || "",
};

export function useWatchViewMode(): [ViewMode | null, (value: ViewMode | null) => void] {
  return useQueryState("viewMode", viewModeParser);
}
