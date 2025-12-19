import { ExtCtxReadyContext } from "@/features/live-preview/IframeContextProvider";
import { getBaseHref } from "@/features/live-preview/PreviewContent";

// Shared CSS injection logic with smooth transitions

export function injectCssFiles(context: ExtCtxReadyContext, cssFiles: string[], onAllLoaded?: () => void): void {
  const head = context.document.head;

  const newBaseHrefs = new Set(cssFiles.map(getBaseHref));
  let pendingLoads = 0;

  const checkAllLoaded = () => {
    if (pendingLoads === 0) {
      // Emit event in the context window
      context.window.dispatchEvent(new CustomEvent("cssLoaded"));
      if (onAllLoaded) {
        onAllLoaded();
      }
    }
  };

  // Step 1: Add or swap links with smooth transitions
  cssFiles.forEach((newHref) => {
    const baseHref = getBaseHref(newHref);
    const existingLinks = head.querySelectorAll<HTMLLinkElement>(`link[data-preview-css="${baseHref}"]`);

    // Skip if this exact href already exists
    if (Array.from(existingLinks).some((link) => link.href === newHref)) return;

    const newLink = createCssLink(context, newHref, baseHref);

    pendingLoads++;
    const handleLoadOrError = () => {
      pendingLoads--;
      cleanupListeners(newLink, handleLoadOrError);

      // Remove old versions if they exist
      existingLinks.forEach((oldLink) => oldLink.remove());

      checkAllLoaded();
    };

    attachLoadHandlers(newLink, handleLoadOrError);
    head.appendChild(newLink);
  });

  // Step 2: Clean up links for CSS files that are no longer needed
  const existingLinks = head.querySelectorAll<HTMLLinkElement>("link[data-preview-css]");
  existingLinks.forEach((link) => {
    const managedHref = link.getAttribute("data-preview-css");
    if (managedHref && !newBaseHrefs.has(managedHref)) {
      link.remove();
    }
  });

  // If no CSS files were added, call callback immediately
  checkAllLoaded();
}
function createCssLink(context: ExtCtxReadyContext, href: string, baseHref: string): HTMLLinkElement {
  const link = context.document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-preview-css", baseHref);
  return link;
}
function attachLoadHandlers(link: HTMLLinkElement, handler: () => void): void {
  link.addEventListener("load", handler);
  link.addEventListener("error", handler);
}
function cleanupListeners(link: HTMLLinkElement, handler: () => void): void {
  link.removeEventListener("load", handler);
  link.removeEventListener("error", handler);
}
