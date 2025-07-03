import { ViewMode, realmPlugin, viewMode$ } from "@mdxeditor/editor";
import { useEffect } from "react";

export const viewModeHash = (vm: ViewMode) => `#viewMode="${vm}"`;

export const HashListener = () => {
  useEffect(() => {
    const onHashChange = () => {
      const viewMode = handleUrlParamViewMode("hash", "viewMode");
      if (viewMode) {
        console.log({ viewMode });
        // window.location.hash = "";
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  return null;
};
function handleUrlParamViewMode(type = "hash", key = "viewMode") {
  const windowHref = window.location.href;
  const urlParams =
    type === "hash" ? new URLSearchParams(new URL(windowHref).hash.slice(1)) : new URL(windowHref).searchParams;

  let viewMode = null;
  try {
    viewMode = JSON.parse((urlParams.get(key) ?? "") as string) as ViewMode | null;
  } catch (_e) {
    /*swallow*/
  }
  if (!viewMode) return;
  const viewModes: Array<ViewMode> = ["rich-text", "source", "diff"];
  if (viewMode && typeof viewMode === "string" && viewModes.includes(viewMode)) {
    return viewMode;
  }
}
export const urlParamViewModePlugin = realmPlugin({
  postInit(realm, params?: { type?: "hash" | "search"; key?: string }) {
    const viewMode = handleUrlParamViewMode(params?.type, params?.key);
    if (viewMode) {
      realm.pub(viewMode$, viewMode);
      if (realm.getValue(viewMode$) === viewMode) {
        // window.location.hash = "";
      }
    }
  },
});
