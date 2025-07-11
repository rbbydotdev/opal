"use client";

import { CardTiltWindow } from "@/components/ui/CardTilt";
import { Opal } from "@/lib/Opal";

export default function Home() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <CardTiltWindow className="rounded-xl p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center relative z-10 ">
        <div className="rotate-12">
          <div
            className="animate-spin"
            style={{
              animationDuration: "1s",
              animationIterationCount: 1,
            }}
          >
            <Opal size={78} />
          </div>
        </div>
        <div className="font-thin text-2xl font-mono text-center">Opal</div>
      </CardTiltWindow>
    </div>
  );
}
