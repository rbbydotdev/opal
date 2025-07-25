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

  // let viewMode = null;
  try {
    const viewMode = urlParams.get(key)?.includes(`"`)
      ? (JSON.parse((urlParams.get(key) ?? "") as string) as ViewMode | null)
      : urlParams.get(key);
    if (!viewMode) return null;
    const viewModes: Array<ViewMode> = ["rich-text", "source", "diff"];
    if (typeof viewMode === "string" && viewModes.includes(viewMode)) {
      return viewMode;
    }
  } catch (_e) {
    /*swallow*/
  }
  return null;
}
export const urlParamViewModePlugin = realmPlugin({
  postInit(realm, params?: { type?: "hash" | "search"; key?: string }) {
    const viewMode = handleUrlParamViewMode(params?.type, params?.key);
    if (viewMode) {
      realm.pub(viewMode$, viewMode);
    }
  },
});
