import { ViewMode } from "@mdxeditor/editor";

export const setViewMode = (viewMode: ViewMode | null) => {
  const url = new URL(window.location.href);
  if (viewMode === null) {
    url.searchParams.delete("viewMode");
  } else {
    url.searchParams.set("viewMode", viewMode);
  }
  window.history.replaceState({}, "", url.toString());
};
