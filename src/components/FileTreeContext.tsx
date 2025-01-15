import { AbsPath } from "@/lib/paths";
import React from "react";

export const FileTreeMenuContext = React.createContext<{
  editing: AbsPath | null;
  setEditing: React.Dispatch<React.SetStateAction<AbsPath | null>>;
  editType: "rename" | "new";
  setFocused: (path: AbsPath | null) => void;
  focused: AbsPath | null;
  setEditType: React.Dispatch<React.SetStateAction<"rename" | "new">>;
  resetEditing: () => void;
  setSelectedRange: (r: string[]) => void;
  selectedRange: string[];
  virtual: AbsPath | null;
  setVirtual: (path: AbsPath | null) => void;
} | null>(null);

export function useFileTreeMenuContext() {
  const ctx = React.useContext(FileTreeMenuContext);
  if (!ctx) {
    throw new Error("useFileTreeMenuContext must be used within a FileTreeMenuContextProvider");
  }
  return ctx;
}
export const FileTreeMenuContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editing, setEditing] = React.useState<AbsPath | null>(null);
  const [editType, setEditType] = React.useState<"rename" | "new">("rename");
  const [focused, setFocused] = React.useState<AbsPath | null>(null);
  const [virtual, setVirtual] = React.useState<AbsPath | null>(null);
  const [selectedRange, setSelectedRange] = React.useState<string[]>([]);
  const resetEditing = () => {
    setEditing(null);
    setEditType("rename");
    setFocused(null);
    setVirtual(null);
  };

  React.useEffect(() => {
    const escapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocused(null);
        setSelectedRange([]);
      }
    };
    window.addEventListener("keydown", escapeKey);
    return () => window.removeEventListener("keydown", escapeKey);
  }, [setFocused]);
  return (
    <FileTreeMenuContext.Provider
      value={{
        selectedRange,
        setSelectedRange,
        setFocused,
        editType,
        setEditType,
        focused,
        setVirtual,
        virtual,
        editing,
        setEditing,
        resetEditing,
      }}
    >
      {children}
    </FileTreeMenuContext.Provider>
  );
};
