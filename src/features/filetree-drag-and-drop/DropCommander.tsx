import { Card } from "@/components/ui/card";
import { ArrowBigDownDash, File, TargetIcon } from "lucide-react";
import React, { createContext, useContext } from "react";
type DropCommanderProps = {
  handleExternalFileDrop: (files: File[]) => Promise<void>;
  handleFileTreeNodeDrop: (files: File[], targetNode: string) => Promise<void>;
  handleDrop: (event: React.DragEvent) => Promise<void>;
};

const DropCommanderContext = createContext<DropCommanderProps>({
  handleExternalFileDrop: async () => {},
  handleFileTreeNodeDrop: async () => Promise.resolve(),
  handleDrop: async () => Promise.resolve(),
});

//detect dragging

export function DropCommanderProvider({ children }: { children: React.ReactNode }) {
  // You can add your context values here later
  const [isOpen, setIsOpen] = React.useState(false);
  const handleExternalFileDrop = async () => {};
  const handleFileTreeNodeDrop = async () => {};
  const handleDrop = async () => {};

  const listen = () => {};

  return (
    <DropCommanderContext.Provider
      value={{
        handleFileTreeNodeDrop,
        handleExternalFileDrop,
        handleDrop,
      }}
    >
      <>{children}</>
    </DropCommanderContext.Provider>
  );
}

export function useDropCommander() {
  const context = useContext(DropCommanderContext);
  if (context === undefined) {
    throw new Error("useDropCommander must be used within a DropCommanderProvider");
  }
  return context;
}

const _ExtravaCard = () => (
  <Card className="rotate-6 w-96 h-96 border bg-secondary text-secondary-foreground rounded-lg flex items-center flex-col justify-center gap-2 drop-shadow-lg">
    <div>
      <div>
        <div className="relative w-[72px] h-[72px]  -translate-y-12 translate-x-4 rotate-6 scale-150">
          <File
            size={72}
            fill="hsl(var(--secondary-foreground))"
            strokeWidth={1}
            stroke="hsl(var(--secondary))"
            className="rotate-[32deg] translate-x-7 translate-y-7 absolute"
          />
          <File
            stroke="hsl(var(--secondary))"
            fill="hsl(var(--secondary-foreground))"
            size={72}
            strokeWidth={1}
            className="rotate-[0deg] absolute"
          />
          <File
            fill="hsl(var(--secondary-foreground))"
            size={72}
            strokeWidth={1}
            stroke="hsl(var(--secondary))"
            className="rotate-[-12deg] -translate-x-5 translate-y-5 absolute"
          />
        </div>
        <ArrowBigDownDash strokeWidth={1} size={96} className=" animate-bounce" />
        <TargetIcon strokeWidth={1} size={96} className="text-destructive" />
      </div>
    </div>
    <div className="flex flex-col items-center gap-1">
      <div className="font-mono text-sm">drag & drop</div>
      <div className="font-mono text-sm">(docx, md, png, svg, jpeg, webp)</div>
    </div>
  </Card>
);
