import { Sticker } from "@/components/Sticker";
import { Card } from "@/components/ui/card";

export function OpalCard() {
  return (
    <Card className="rounded-xl p-8 border w-56 h-56 flex items-center flex-col gap-4 justify-center relative z-10">
      <div className="mb-4">
        <Sticker />
      </div>
      <div className="font-thin text-2xl font-mono text-center">Opal</div>
    </Card>
  );
}
