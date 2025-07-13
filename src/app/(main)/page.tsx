"use client";

import { Card } from "@/components/ui/card";
import { Tilt } from "@/components/ui/Tilt";
import { Opal } from "@/lib/Opal";

export default function Home() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="rounded-xl p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center relative z-10 ">
        <div className="rotate-12">
          <Tilt maxRotate={30}>
            <div>
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
          </Tilt>
        </div>
        <div className="font-thin text-2xl font-mono text-center">Opal</div>
      </Card>
    </div>
  );
}
