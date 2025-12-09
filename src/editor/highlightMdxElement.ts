export const MDX_TREE_HIGHLIGHT_NAME = "MdxTreeHighlight";

export function highlightMdxElement(el: HTMLElement) {
  const range = document.createRange();
  range.selectNode(el);
  range.selectNodeContents(el);
  CSS.highlights.set(MDX_TREE_HIGHLIGHT_NAME, new Highlight(range));

  return function clearHighlight() {
    CSS.highlights.delete(MDX_TREE_HIGHLIGHT_NAME);
  };
}
