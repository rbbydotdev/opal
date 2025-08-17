import { getViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { realmPlugin, viewMode$ } from "@mdxeditor/editor";

export const urlParamViewModePlugin = realmPlugin({
  postInit(realm, params?: { type?: "hash" | "search"; key?: string }) {
    const viewMode = getViewMode(params?.key, params?.type);
    if (viewMode) {
      realm.pub(viewMode$, viewMode);
    }
  },
});
