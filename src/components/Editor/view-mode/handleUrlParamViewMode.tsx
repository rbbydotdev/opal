import { ViewMode } from "@mdxeditor/editor";

export const viewModeHash = (vm: ViewMode) => `#viewMode="${vm}"`;

export type ViewModeParamType = "hash+search" | "hash" | "search";
export function getViewMode(
  key = "viewMode",
  type: ViewModeParamType = "hash+search"
): "rich-text" | "source" | "diff" | null {
  const windowHref = window.location.href;
  const url = new URL(windowHref);
  const hashParams = new URLSearchParams(url.hash.slice(1));
  const searchParams = url.searchParams;

  try {
    const raw =
      type === "hash"
        ? hashParams.get(key)
        : type === "search"
          ? searchParams.get(key)
          : // "hash+search": prefer hash, fallback to search
            (hashParams.get(key) ?? searchParams.get(key));

    const viewMode = raw?.includes(`"`) ? (JSON.parse((raw ?? "") as string) as ViewMode | null) : raw;
    if (!viewMode) return null;
    const viewModes: Array<ViewMode> = ["rich-text", "source", "diff"];
    return viewModes.find((vm) => vm === viewMode) || null;
  } catch (_e) {
    return null;
  }
}

export const setViewMode = (viewMode: ViewMode | null, viewModeParamType: ViewModeParamType) => {
  if (viewMode === null) {
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }
  const viewModeHash = `#viewMode="${viewMode}"`;
  if (viewModeParamType === "hash") {
    window.location.hash = viewModeHash;
  } else if (viewModeParamType === "search") {
    const url = new URL(window.location.href);
    url.searchParams.set("viewMode", viewMode);
    window.history.replaceState({}, "", url.toString());
  } else {
    // "hash+search"
    window.location.hash = viewModeHash;
  }
};
