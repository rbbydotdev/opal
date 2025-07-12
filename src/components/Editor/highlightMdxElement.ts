export const MDX_TREE_HIGHLIGHT_NAME = "MdxTreeHighlight";

export function highlightMdxElement(el: HTMLElement) {
  const range = document.createRange();
  range.selectNode(el);
  range.selectNodeContents(el);
  const highlight = new Highlight(range);
  CSS.highlights.set(MDX_TREE_HIGHLIGHT_NAME, highlight);

  // Return a function to clear the highlight
  return function clearHighlight() {
    CSS.highlights.delete(MDX_TREE_HIGHLIGHT_NAME);
  };
}
