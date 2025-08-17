import { getViewMode, ViewModeParamType } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { ViewMode } from "@mdxeditor/editor";
import { useEffect, useState } from "react";

export function useWatchViewMode(watch: ViewModeParamType = "hash+search"): ViewMode | null {
  const [viewMode, setViewMode] = useState(getViewMode("viewMode", "hash+search"));
  useEffect(() => {
    const handleUrlChange = () => {
      setViewMode(getViewMode("viewMode", watch));
    };

    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("pushstate", handleUrlChange);
    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("pushstate", handleUrlChange);
    };
  }, [watch]);
  return viewMode;
}
