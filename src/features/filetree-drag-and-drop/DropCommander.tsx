import { Card } from "@/components/ui/card";
import EventEmitter from "events";
import { ArrowBigDownDash, File, FileIcon, TargetIcon } from "lucide-react";
import React, { createContext, useContext, useMemo } from "react";
type DropCommanderProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  hide: () => void;
  show: () => void;
  handleExternalFileDrop: (files: File[]) => Promise<void>;
  handleFileTreeNodeDrop: (files: File[], targetNode: string) => Promise<void>;
  handleDrop: (event: React.DragEvent) => Promise<void>;
  listen: (element: string) => void;
};

const DropCommanderContext = createContext<DropCommanderProps>({
  isOpen: false,
  setIsOpen: () => {},
  handleExternalFileDrop: async () => {},
  handleFileTreeNodeDrop: async () => Promise.resolve(),
  handleDrop: async () => Promise.resolve(),
  hide: () => {},
  show: () => {},
  listen: (element: string) => {},
});

//detect dragging

function detectExtFileDrag(event: React.DragEvent): boolean {
  return (
    event.dataTransfer &&
    (event.dataTransfer.types.includes("Files") || event.dataTransfer.types.includes("application/x-moz-file"))
  );
}

export function DropCommanderProvider({ children }: { children: React.ReactNode }) {
  // You can add your context values here later
  const [isOpen, setIsOpen] = React.useState(false);
  const handleExternalFileDrop = async () => {};
  const handleFileTreeNodeDrop = async () => {};
  const handleDrop = async () => {};

  const hide = () => setIsOpen(false);
  const show = () => {
    if (!isOpen) setIsOpen(true);
  };
  const events = useMemo(() => {
    const Events = new EventEmitter();
    return () => Events.removeAllListeners();
  }, []);
  const listen = () => {};

  return (
    <DropCommanderContext.Provider
      value={{
        setIsOpen,
        isOpen,
        hide,
        listen,
        show,
        handleFileTreeNodeDrop,
        handleExternalFileDrop,
        handleDrop,
      }}
    >
      <>
        <div
          className="drop-commander inset-0 w-full h-full absolute z-50 pointer-events-none"
          onDrop={(e) => {
            //get the element is dropped on
            const droppedElement = document.elementFromPoint(e.clientX, e.clientY);
            console.log(droppedElement);
            // console.log("Dropped on element:", droppedElement);
          }}
          onDragOver={(e) => {
            show();
            if (detectExtFileDrag(e)) {
            }
          }}
          // onDragLeave={(e) => {
          //   e.preventDefault();
          //   hide();
          // }}
          // onDrop={async (e) => {
          //   e.preventDefault();
          //   await handleDrop(e);
          //   hide();
          // }}
        ></div>
        {children}
        {isOpen && (
          <div className="absolute inset-0 bg-primary/40 w-full h-full z-50 flex justify-center items-center">
            <Card className="w-96 h-48 p-4 flex justify-center items-center">
              <div className="flex flex-col text-xs border-primary items-center gap-1 border border-dashed w-full h-full rounded justify-center">
                <FileIcon />
                <div className="font-mono ">drag & drop</div>
                <div className="font-mono ">(docx, md, png, svg, jpeg, webp)</div>
              </div>
            </Card>
          </div>
        )}
      </>
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
