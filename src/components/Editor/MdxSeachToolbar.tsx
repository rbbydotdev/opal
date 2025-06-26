import { useEditorSearch } from "@/components/Editor/searchPlugin";
import { EditorSearchBar } from "@/features/editor-search/EditorSearchBar";
import { useEditorSearchTool } from "@/features/editor-search/useEditorSearch";
import { editorRootElementRef$, useRealm } from "@mdxeditor/editor";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export const MdxSearchToolbar = () => {
  const { isSearchOpen, closeSearch } = useEditorSearchTool();
  const realm = useRealm();
  const editorRootEl = realm.getValue(editorRootElementRef$);
  const { prev, next, cursor, setSearch, ranges, replace, replaceAll, setMode } = useEditorSearch();

  const handleSearchClose = useCallback(() => {
    closeSearch();
    editorRootEl?.current.focus();
  }, [closeSearch, editorRootEl]);

  const handleSearchChange = useCallback(
    (searchTerm: string | null) => {
      setSearch(searchTerm);
    },
    [setSearch]
  );
  useEffect(() => {
    if (!isSearchOpen) {
      setMode("typing");
    } else {
      setMode("replace");
    }
  }, [isSearchOpen, setMode]);

  return createPortal(
    <EditorSearchBar
      prev={prev}
      next={next}
      cursor={cursor}
      isOpen={isSearchOpen}
      replace={replace}
      replaceAll={replaceAll}
      onClose={handleSearchClose}
      onChange={(searchTerm) => {
        handleSearchChange(searchTerm);
      }}
      matchTotal={ranges.length}
    />,
    document.body
  );
};
