import OpalThemeSvg from "@/opalsvg/opal-theme.svg?react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Sticker = memo(function Sticker({ enabled }: { enabled?: boolean }) {
  const stickerRef = useRef<SVGSVGElement>(null);
  const boundsRef = useRef<{ y: number; x: number } | null>(null);

  // Static configuration
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
      pointer: true,
      shadow: "hsl(0, 0%, 0%)",
      shadowOpacity: 0.25,
      shadowDev: 3,
      dx: 1,
      dy: 3,
      defaultLight: { x: -50, y: -50, z: 65 },
    }),
    []
  );

  const [lightPos, setLightPos] = useState(config.defaultLight);

  // Sync light with pointer position smoothly via RAF
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!stickerRef.current || !config.pointer) return;
      boundsRef.current = stickerRef.current.getBoundingClientRect();
      setLightPos({
        x: Math.floor(e.clientX - boundsRef.current.x),
        y: Math.floor(e.clientY - boundsRef.current.y),
        z: config.defaultLight.z,
      });
    },
    [config.pointer, config.defaultLight.z]
  );

  useEffect(() => {
    if (config.pointer && enabled) {
      const controller = new AbortController();
      window.addEventListener("pointermove", handlePointerMove, { signal: controller.signal });
      return () => controller.abort();
    }
  }, [config.pointer, enabled, handlePointerMove]);

  useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
  }, [config.theme]);

  return (
    <div className="h-full w-full flex justify-center items-center">
      <svg
        ref={stickerRef}
        style={{
          filter: "url(#sticker-filter)",

          width: "120px",
          height: "80px",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {enabled && (
            <filter id="sticker-filter">
              {/* Outline & merge layers */}
              <feMerge result="merged">
                <feMergeNode in="outlineflat" />
                <feMergeNode in="outline" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>

              {/* Blurs & lighting */}
              <feGaussianBlur in="SourceAlpha" stdDeviation={config.deviation} result="blur" />
              <feSpecularLighting
                result="lighting"
                in="blur"
                surfaceScale={config.surface}
                specularConstant={config.specular}
                specularExponent={config.exponent}
                lightingColor={config.light}
              >
                <fePointLight x={lightPos.x} y={lightPos.y} z={lightPos.z} />
              </feSpecularLighting>

              {/* Lighting composition */}
              <feComposite in="lighting" in2="SourceAlpha" operator="in" result="lit" />
              <feComposite in="merged" in2="lit" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />

              {/* Drop shadow */}
              <feDropShadow
                dx={config.dx}
                dy={config.dy}
                stdDeviation={config.shadowDev}
                floodColor={config.shadow}
                floodOpacity={config.shadowOpacity}
              />
            </filter>
          )}
        </defs>

        <g filter="url(#sticker-filter)">
          <OpalThemeSvg />
        </g>
      </svg>
    </div>
  );
});
