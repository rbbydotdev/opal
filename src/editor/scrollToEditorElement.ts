import { MdxEditorScrollSelector } from "@/editor/EditorConst";

export const scrollToEditorElement = (
  element: { getClientRects: () => DOMRectList },
  options?: {
    offset?: number;
    ignoreIfInView?: boolean;
    behavior?: ScrollBehavior;
  },
  scrollContentElement = document.querySelector(MdxEditorScrollSelector) as HTMLElement
) => {
  if (!element) return;
  const ignoreIfInView = options?.ignoreIfInView ?? false;
  const behavior = options?.behavior ?? "smooth";
  const [first] = element.getClientRects();

  if (!scrollContentElement) {
    return logger.warn("No content-editable element found for scrolling.");
  }
  if (!first) {
    return logger.warn("No client rect found for the element, cannot scroll.");
  }

  // Get bounding rects relative to the scroll container
  const containerRect = scrollContentElement.getBoundingClientRect();
  const topRelativeToContainer = first.top - containerRect.top;
  const bottomRelativeToContainer = first.bottom - containerRect.top;
  // Optionally ignore if already in view
  if (ignoreIfInView) {
    // The visible area is [scrollTop, scrollTop + clientHeight]
    // The range is in view if its top and bottom are within this area
    const rangeTop = topRelativeToContainer + scrollContentElement.scrollTop;
    const rangeBottom = bottomRelativeToContainer + scrollContentElement.scrollTop;
    const visibleTop = scrollContentElement.scrollTop;
    const visibleBottom = visibleTop + scrollContentElement.clientHeight;

    const inView = rangeTop >= visibleTop && rangeBottom <= visibleBottom;

    if (inView) return;
  }

  // Scroll so the range is near the top, with some offset if desired
  const top = topRelativeToContainer + scrollContentElement.scrollTop - first.height + (options?.offset ?? 0);

  scrollContentElement.scrollTo({ top, behavior });
};
