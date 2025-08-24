import opalThemeSvg from "@/opalsvg/opal-theme.svg?raw";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";

export const Sticker = memo(function Sticker() {
  const stickerRef = useRef<HTMLDivElement>(null);

  // Stable config
  const config = useMemo(
    () => ({
      theme: "light",
      radius: 4,
      outline: "#fff",
      base: 0.4,
      octaves: 4,
      seed: 120,
      type: "turbulence",
      deviation: 2,
      surface: 8,
      specular: 6,
      exponent: 65,
      light: "hsla(0, 0%, 80%, 0.5)",
      x: 50,
      y: 50,
      z: 65,
      pointer: true,
      dx: 1,
      dy: 3,
      shadow: "hsl(0, 0%, 0%)",
      shadowOpacity: 0.75,
      shadowDev: 3,
    }),
    []
  );

  // Throttled pointer handler
  const syncLight = useCallback(() => {
    let frame: number | null = null;

    return ({ x, y }: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const sticker = stickerRef.current;
        if (!sticker) return;
        const fePointLight = sticker.querySelector("fePointLight");
        if (!fePointLight) return;

        const bounds = sticker.getBoundingClientRect();
        fePointLight.setAttribute("x", String(Math.floor(x - bounds.x)));
        fePointLight.setAttribute("y", String(Math.floor(y - bounds.y)));
        frame = null;
      });
    };
  }, [])();

  useEffect(() => {
    const sticker = stickerRef.current;
    if (!sticker) return;

    const feMorphology = sticker.querySelector("feMorphology");
    const feFlood = sticker.querySelector("feFlood");
    const feTurbulence = sticker.querySelector("feTurbulence");
    const feGaussianBlur = sticker.querySelector("feGaussianBlur");
    const feSpecularLighting = sticker.querySelector("feSpecularLighting");
    const fePointLight = sticker.querySelector("fePointLight");
    const feDropShadow = sticker.querySelector("feDropShadow");

    // Apply config
    document.documentElement.dataset.theme = config.theme;
    feMorphology?.setAttribute("radius", String(config.radius));
    feFlood?.setAttribute("flood-color", config.outline);
    feTurbulence?.setAttribute("seed", String(config.seed));
    feTurbulence?.setAttribute("type", config.type);
    feTurbulence?.setAttribute("numOctaves", String(config.octaves));
    feTurbulence?.setAttribute("baseFrequency", String(config.base));
    feGaussianBlur?.setAttribute("stdDeviation", String(config.deviation));
    feSpecularLighting?.setAttribute("surfaceScale", String(config.surface));
    feSpecularLighting?.setAttribute("specularConstant", String(config.specular));
    feSpecularLighting?.setAttribute("specularExponent", String(config.exponent));
    feSpecularLighting?.setAttribute("lighting-color", config.light);
    fePointLight?.setAttribute("x", String(config.x));
    fePointLight?.setAttribute("y", String(config.y));
    fePointLight?.setAttribute("z", String(config.z));
    feDropShadow?.setAttribute("dx", String(config.dx));
    feDropShadow?.setAttribute("dy", String(config.dy));
    feDropShadow?.setAttribute("flood-color", config.shadow);
    feDropShadow?.setAttribute("flood-opacity", String(config.shadowOpacity));
    feDropShadow?.setAttribute("stdDeviation", String(config.shadowDev));

    // Attach pointer listener once
    if (config.pointer) {
      sticker.dataset.pointerLighting = "true";
      window.addEventListener("pointermove", syncLight);
    } else {
      sticker.dataset.pointerLighting = "false";
    }

    return () => {
      window.removeEventListener("pointermove", syncLight);
    };
  }, [config, syncLight]);

  return (
    <div
      ref={stickerRef}
      className="sticker w-[clamp(200px,35vmin,400px)]"
      dangerouslySetInnerHTML={{
        __html: `
        <svg class="sr-only">
          <filter id="sticker">
            <feMerge result="merged">
              <feMergeNode in="outlineflat"></feMergeNode>
              <feMergeNode in="outline"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"></feGaussianBlur>
            <feSpecularLighting result="lighting" in="blur" surfaceScale="5" specularConstant="0.5" specularExponent="120" lighting-color="#ffffff">
              <fePointLight x="50" y="50" z="300"></fePointLight>
            </feSpecularLighting>
            <feComposite in="lighting" in2="SourceAlpha" operator="in" result="composite"></feComposite>
            <feComposite in="merged" in2="composite" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint"></feComposite>
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
          </filter>
        </svg>
        <div style="filter:url(#sticker);display:flex;justify-content:center;">
      ${opalThemeSvg}
        </div>
      `,
      }}
    />
  );
});
