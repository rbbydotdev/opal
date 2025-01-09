"use client";
import Identicon from "@/components/Identicon";

const RANDS = new Array(999).fill(0).map(() => Math.random().toString());
export function ClientIcon() {
  return (
    <div className="">
      {RANDS.map((rand) => (
        <div key={rand} className="inline-block border-2 border-black overflow-hidden w-23 h-23">
          <Identicon input={rand} size={5} scale={20} />
        </div>
      ))}
    </div>
  );
}
