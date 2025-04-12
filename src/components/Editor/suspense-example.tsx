const imageCache = new Set();
export function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onerror = img.onload = () => {
        imageCache.add(src);
        resolve(null);
      };
    });
  }
}
