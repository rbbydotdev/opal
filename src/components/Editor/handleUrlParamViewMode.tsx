import { ViewMode } from "@mdxeditor/editor";

export const viewModeHash = (vm: ViewMode) => `#viewMode="${vm}"`;

export function handleUrlParamViewMode(type = "hash", key = "viewMode"): "rich-text" | "source" | "diff" | null {
  const windowHref = window.location.href;
  const urlParams =
    type === "hash" ? new URLSearchParams(new URL(windowHref).hash.slice(1)) : new URL(windowHref).searchParams;

  try {
    const viewMode = urlParams.get(key)?.includes(`"`)
      ? (JSON.parse((urlParams.get(key) ?? "") as string) as ViewMode | null)
      : urlParams.get(key);
    if (!viewMode) return null;
    const viewModes: Array<ViewMode> = ["rich-text", "source", "diff"];
    return viewModes.find((vm) => vm === viewMode) || null;
  } catch (_e) {
    return null;
  }
}
