import { ViewMode } from "@mdxeditor/editor";

export const viewModeHash = (vm: ViewMode) => `#viewMode="${vm}"`;

export function handleUrlParamViewMode(
  type: "search" | "hash" | "hash+search" = "hash+search",
  key = "viewMode"
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
