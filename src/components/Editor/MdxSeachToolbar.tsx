import { editorSearchTerm$, useEditorSearch } from "@/components/Editor/searchPlugin";
import { EditorSearchBar } from "@/features/editor-search/EditorSearchBar";
import { useEditorSearchTool } from "@/features/editor-search/useEditorSearch";
import { editorRootElementRef$, useRealm } from "@mdxeditor/editor";
import { useCallback } from "react";
import { createPortal } from "react-dom";

export const MdxSearchToolbar = () => {
  const { isSearchOpen, closeSearch } = useEditorSearchTool();
  const realm = useRealm();
  const editorRootEl = realm.getValue(editorRootElementRef$);

  const handleSearchClose = useCallback(() => {
    closeSearch();
    editorRootEl?.current.focus();
  }, [closeSearch, editorRootEl]);

  const handleSearchChange = useCallback(
    (searchTerm: string | null) => {
      realm.pub(editorSearchTerm$, searchTerm);
    },
    [realm]
  );
  const { prev, next, cursor, ranges } = useEditorSearch();

  return createPortal(
    <EditorSearchBar
      prev={prev}
      next={next}
      cursor={cursor}
      isOpen={isSearchOpen}
      onClose={handleSearchClose}
      className="absolute top-16 right-4 z-50"
      onChange={(searchTerm) => {
        handleSearchChange(searchTerm);
      }}
      matchTotal={ranges.length}
    />,
    document.body
  );
};
