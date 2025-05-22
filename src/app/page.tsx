"use client";

import { Opal } from "@/lib/Opal";

export default function Home() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="rounded-xl text-accent-foreground p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center bg-white relative z-10">
        <div
          className="animate-spin"
          style={{
            animationDuration: "1s",
            animationIterationCount: 1,
          }}
        >
          <Opal size={78} />
        </div>
        <div className="font-thin text-2xl font-mono text-center">Opal</div>
      </div>
    </div>
  );
}
