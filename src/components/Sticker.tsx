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
            <feMorphology in="SourceAlpha" result="dilate" operator="dilate" radius="2"></feMorphology>
            <feFlood flood-color="#fafafa" result="outlinecolor"></feFlood>
            <feTurbulence baseFrequency="0.03" seed="1" numOctaves="3" type="turbulence" result="turb"></feTurbulence>
            <feComposite in="turb" in2="dilate" operator="in" result="outline"></feComposite>
            <feComposite in="outlinecolor" in2="dilate" operator="in" result="outlineflat"></feComposite>
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
        <div class="sticker" style="filter:url(#sticker);display:flex;justify-content:center;">
          <svg width="120" height="80" viewBox="0 0 28 30" xmlns="http://www.w3.org/2000/svg" stroke="none">
            <defs>
              <mask id="opal-mask">
                <path d="M 14, 0 C 4, 0, 0, 4, 0, 14 S 4, 28, 14, 28 S 28, 24, 28, 14 S 24, 0, 14, 0 Z" fill="white" />
              </mask>
            </defs>
            <path d="M 14, 0 C 4, 0, 0, 4, 0, 14 S 4, 28, 14, 28 S 28, 24, 28, 14 S 24, 0, 14, 0 Z" fill="rgb(255, 248, 240)" />
            <g mask="url(#opal-mask)">
              <circle cx="3.5" cy="3.5" r="2.905" fill="rgb(102, 153, 255)" opacity="0.93"></circle>
              <circle cx="10.5" cy="3.5" r="2.87" fill="rgb(255, 102, 178)" opacity="0.72"></circle>
              <rect x="14.49" y="0.49" width="6.02" height="6.02" fill="rgb(102, 255, 178)" opacity="0.66" transform="rotate(66, 17.5, 3.5)"></rect>
              <circle cx="24.5" cy="3.5" r="3.15" fill="rgb(102, 178, 255)" opacity="0.8"></circle>
              <polygon points="0.63,12.74 3.5,7.63 5.74,12.74" fill="rgb(255, 178, 102)" opacity="0.72" transform="rotate(122, 3.5, 10.5)"></polygon>
              <circle cx="10.5" cy="10.5" r="3.185" fill="rgb(178, 102, 255)" opacity="0.81"></circle>
              <circle cx="17.5" cy="10.5" r="2.835" fill="rgb(102, 255, 102)" opacity="0.81"></circle>
              <polygon points="21.455,13.09 24.5,7.455 27.09,13.09" fill="rgb(255, 255, 102)" opacity="0.97" transform="rotate(47, 24.5, 10.5)"></polygon>
              <circle cx="3.5" cy="17.5" r="2.975" fill="rgb(102, 255, 178)" opacity="0.85"></circle>
              <polygon points="7.175,20.65 10.5,14.175 13.65,20.65" fill="rgb(255, 102, 102)" opacity="0.95" transform="rotate(95, 10.5, 17.5)"></polygon>
              <rect x="14.21" y="14.21" width="6.58" height="6.58" fill="rgb(102, 255, 255)" opacity="0.54" transform="rotate(54, 17.5, 17.5)"></rect>
              <circle cx="24.5" cy="17.5" r="2.905" fill="rgb(153, 102, 255)" opacity="0.53"></circle>
              <rect x="0.56" y="21.56" width="5.88" height="5.88" fill="rgb(255, 153, 255)" opacity="0.74" transform="rotate(24, 3.5, 24.5)"></rect>
              <circle cx="10.5" cy="24.5" r="2.87" fill="rgb(102, 255, 102)" opacity="0.52"></circle>
              <circle cx="17.5" cy="24.5" r="3.395" fill="rgb(178, 102, 255)" opacity="0.97"></circle>
              <rect x="21.665" y="21.665" width="5.67" height="5.67" fill="rgb(102, 178, 255)" opacity="0.71" transform="rotate(21, 24.5, 24.5)"></rect>
            </g>
          </svg>
        </div>
      `,
      }}
    />
  );
});
