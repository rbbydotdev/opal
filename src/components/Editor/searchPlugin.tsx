import { HighlightTransform } from "@/components/Editor/HighlightTransform";
import { activeEditor$, realmPlugin } from "@mdxeditor/editor";
import { RootNode } from "lexical";

export const searchPlugin = realmPlugin({
  postInit(realm) {
    //add cmd+f shortcut to open search
    const editor = realm.getValue(activeEditor$);

    // const HighlightTransformer = new HighlightTransform("foobar");
    window.addEventListener("keydown", (e) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const editor = realm.getValue(activeEditor$);
        if (editor) {
          // HighlightTransformer.searchQuery =
          //   prompt("Enter search query:", HighlightTransformer.searchQuery) ?? HighlightTransformer.searchQuery;
          // editor.update(() => {
          //   // No-op: just read the root node
          //   $getRoot()
          //     .getAllTextNodes()
          //     .forEach((textNode) => {
          //       HighlightTransformer.textNodeTransform(textNode);
          //     });
          // });
          // editor.focus();
          // // Open search dialog or perform search
          // // This is a placeholder for your search logic
          // console.log("Search triggered");
        }
      }
    });

    if (editor) {
      const highlighter = new HighlightTransform();
      editor.registerNodeTransform(RootNode, (rootNode) => {
        editor.update(() => {
          highlighter.searchIndex("foobar", rootNode);
        });
      });
    } else {
      console.log("No active editor found when initializing search plugin");
    }
  },
});
