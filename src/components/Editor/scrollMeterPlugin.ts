import { realmPlugin } from "@mdxeditor/editor";
export const scrollMeterPlugin = realmPlugin({
  postInit(realm) {
    document.querySelector(".content-editable");
  },
});
