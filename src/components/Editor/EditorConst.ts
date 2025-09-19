import { Cell, setMarkdown$ } from "@mdxeditor/editor";
import graymatter from "gray-matter";

export const MainEditorRealmId = "MdxEditorRealm";
export const MdxEditorSelector = ".mdxeditor";
export const setMarkdownOnly$ = Cell<string | null>("", (realm) => {
  realm.sub(setMarkdownOnly$, (md) => {
    realm.pub(setMarkdown$, graymatter(md ?? "").content);
  });
});
