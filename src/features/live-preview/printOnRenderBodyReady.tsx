import { flushSync } from "react-dom";

export function printOnRenderBodyReady(
  el: HTMLElement,
  context: {
    document: Document;
    window: Window;
    ready: true;
  }
) {
  flushSync(() => {
    const script = context.document.createElement("script");
    script.textContent = /* javascript */ `
    window.addEventListener('afterprint', () => {
      window.opener?.postMessage({ type: 'hidePrintOverlay' }, '*');
      window.close();
    });
    window.print()
  `;
    el.appendChild(script);
  });
}
