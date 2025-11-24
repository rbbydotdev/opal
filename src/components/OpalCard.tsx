import { Sticker } from "@/components/Sticker";
import { Card } from "@/components/ui/card";
import useLocalStorage2 from "@/hooks/useLocalStorage2";

export function OpalCard() {
  const { storedValue, setStoredValue } = useLocalStorage2("OpalCard/Enabled", true);
  return (
    <Card className="rounded-xl p-8 border w-56 h-56 flex items-center flex-col gap-4 justify-center relative z-10">
      <div className="mb-4">
        <button
          onClick={() => setStoredValue((prev) => !prev)}
          className="active:scale-90 transition-transform outline-none"
        >
          <Sticker enabled={storedValue} />
        </button>
      </div>
      <div className="font-thin text-2xl font-mono text-center">Opal</div>
    </Card>
  );
}
