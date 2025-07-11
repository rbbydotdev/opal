import { Card } from "@/components/ui/card";
import { CardTilt, CardTiltWindow } from "@/components/ui/CardTilt";
import { ArrowBigDownDash, File, FileUpIcon } from "lucide-react";
import React, { createContext, useContext } from "react";

type DropCommanderProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  hide: () => void;
  show: () => void;
  handleExternalFileDrop: (files: File[]) => Promise<void>;
  handleFileTreeNodeDrop: (files: File[], targetNode: string) => Promise<void>;
  handleDrop: (event: React.DragEvent) => Promise<void>;
};

const DropCommanderContext = createContext<DropCommanderProps>({
  isOpen: false,
  setIsOpen: () => {},
  handleExternalFileDrop: async () => {},
  handleFileTreeNodeDrop: async () => Promise.resolve(),
  handleDrop: async () => Promise.resolve(),
  hide: () => {},
  show: () => {},
});

//detect dragging

function detectExtFileDrag(event: React.DragEvent): boolean {
  // Check if the drag event has files
  return event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0;
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

  return (
    <DropCommanderContext.Provider
      value={{
        setIsOpen,
        isOpen,
        hide,
        show,
        handleFileTreeNodeDrop,
        handleExternalFileDrop,
        handleDrop,
      }}
    >
      <span
        className="drop-commander relative w-full h-full"
        onDragOver={(e) => {
          show();
          console.log(detectExtFileDrag(e));
          // console.log(e);
          // if (detectExtFileDrag(e)) {
          //   // e.preventDefault();
          //   show();
          // }
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
      >
        {false && (
          <div className="absolute inset-0 bg-primary/70 w-full h-full z-50 flex justify-center items-center">
            <Card className="rotate-6 w-80 h-80 border bg-secondary text-secondary-foreground rounded-lg flex items-center flex-col justify-center gap-2">
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
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="font-mono text-sm">drag & drop</div>
                <div className="font-mono text-sm">(docx, md, png, svg, jpeg, webp)</div>
              </div>
            </Card>
          </div>
        )}
        {children}
      </span>
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
