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

export function DropCommanderProvider({ children }: { children: React.ReactNode }) {
  // You can add your context values here later
  const [isOpen, setIsOpen] = React.useState(false);
  const handleExternalFileDrop = async () => {};
  const handleFileTreeNodeDrop = async () => {};
  const handleDrop = async () => {};
  const hide = () => setIsOpen(false);
  const show = () => setIsOpen(true);

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
      <>
        {/* {isOpen && <div className="absolute inset-0 bg-primary/70 w-full h-full"></div>} */}
        {<div className="absolute inset-0 bg-primary/70 w-full h-full z-50"></div>}
        {children}
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
