import { Sticker } from "@/components/Sticker";
import { Card } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function OpalCard() {
  const { storedValue, setStoredValue } = useLocalStorage("OpalCard/Enabled", true);
  return (
    <Card className="rounded-xl p-8 border min-w-56 min-h-56 flex items-center flex-col gap-4 justify-center relative z-10">
      <button
        onClick={() => setStoredValue((prev) => !prev)}
        className="active:scale-90 transition-transform outline-none"
      >
        <Sticker enabled={storedValue} />
      </button>
      <div className="font-thin text-2xl font-mono text-center tracking-tight">Opal-Editor</div>

      <div className="absolute bottom-2 m-auto w-full flex items-center justify-center gap-1 h-6 text-2xs mt-0">
        made by
        <a href="https://github.com/rbbydotdev" className="inline text-ring hover:text-ring/80" tabIndex={-1}>
          @rbbydotdev
        </a>
      </div>
    </Card>
  );
}
