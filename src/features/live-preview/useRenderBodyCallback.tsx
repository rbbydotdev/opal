import { useEffect, useRef } from "react";

// Reusable hook for render body callback
export function useRenderBodyCallback(onRenderBodyReady?: (element: HTMLElement) => void, trigger?: any) {
  const renderBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!renderBodyRef.current || !onRenderBodyReady || !trigger) return;

    const element = renderBodyRef.current;
    const images = element.querySelectorAll("img");

    let imagesLoaded = false;
    let cssLoaded = false;

    const checkAllReady = () => {
      if (imagesLoaded && cssLoaded) {
        onRenderBodyReady(element);
      }
    };

    // Handle image loading
    let loadedImageCount = 0;
    const totalImages = images.length;

    const checkImagesComplete = () => {
      loadedImageCount++;
      if (loadedImageCount === totalImages) {
        imagesLoaded = true;
        checkAllReady();
      }
    };

    // Listen for image loads
    if (totalImages > 0) {
      images.forEach((img) => {
        if (img.complete) {
          checkImagesComplete();
        } else {
          img.addEventListener("load", checkImagesComplete, { once: true });
          img.addEventListener("error", checkImagesComplete, { once: true });
        }
      });
    } else {
      imagesLoaded = true;
    }

    // Listen for CSS loading
    const handleCssLoaded = () => {
      cssLoaded = true;
      checkAllReady();
    };

    // Get the window context for listening to CSS events
    const targetWindow = element.ownerDocument?.defaultView || window;

    // Check if there are any CSS files to wait for
    const cssLinks = targetWindow.document?.querySelectorAll("link[data-preview-css]") || [];

    if (cssLinks.length === 0) {
      // No CSS files to wait for
      cssLoaded = true;
    } else {
      // Wait for CSS loading event
      targetWindow.addEventListener("cssLoaded", handleCssLoaded, { once: true });
    }

    // Initial check in case everything is already loaded
    checkAllReady();

    return () => {
      targetWindow.removeEventListener("cssLoaded", handleCssLoaded);
    };
  }, [trigger, onRenderBodyReady]);

  return renderBodyRef;
}
