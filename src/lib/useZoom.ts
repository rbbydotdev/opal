import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { useEffect } from "react";

type ZoomLevel = 0.65 | 0.75 | 0.85 | 0.95 | 1;

export const ZOOM_LEVELS: ZoomLevel[] = [0.65, 0.75, 0.85, 0.95, 1];

export function useZoom() {
  const { storedValue: zoomLevel, setStoredValue: setZoomLevel } = useLocalStorage2<ZoomLevel>("app/zoom-level", 1);

  const applyZoom = (zoom: ZoomLevel) => {
    document.body.style.fontSize = `${zoom}rem`;
    const styleEl = document.querySelector("#dynamic-zoom-style") ?? document.createElement("style");
    styleEl.id = "dynamic-zoom-style";
    styleEl.innerHTML = `html { font-size: ${zoom}rem; }`;
    document.head.appendChild(styleEl);
  };

  const getCurrentZoom = (): ZoomLevel => {
    const styleEl = document.querySelector("#dynamic-zoom-style");
    if (!styleEl) return 1;

    const match = styleEl.innerHTML.match(/font-size: ([\d.]+)rem/);
    if (!match) return 1;

    const currentZoom = parseFloat(match[1]!);
    return ZOOM_LEVELS.find((level) => Math.abs(level - currentZoom) < 0.01) || 1;
  };

  const setZoom = (zoom: ZoomLevel) => {
    applyZoom(zoom);
    setZoomLevel(zoom);
  };

  useEffect(() => {
    applyZoom(zoomLevel);
  }, [zoomLevel]);

  return {
    zoomLevel,
    setZoom,
    getCurrentZoom,
    isCurrentZoom: (zoom: ZoomLevel) => Math.abs(zoomLevel - zoom) < 0.01,
    availableZooms: ZOOM_LEVELS,
  };
}
