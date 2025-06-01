"use client";
import { Workspace } from "@/Db/Workspace";
import { AbsolutePath2 } from "@/lib/paths2";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";

export const FileTreeMenuContext = React.createContext<{
  editing: AbsolutePath2 | null;
  setEditing: React.Dispatch<React.SetStateAction<AbsolutePath2 | null>>;
  editType: "rename" | "new";
  setFocused: (path: AbsolutePath2 | null) => void;
  focused: AbsolutePath2 | null;
  setEditType: React.Dispatch<React.SetStateAction<"rename" | "new">>;
  resetEditing: () => void;
  setSelectedRange: (r: string[]) => void;
  resetSelects: () => void;
  setDragOver: (path: AbsolutePath2 | null) => void;
  dragOver: AbsolutePath2 | null;
  selectedRange: string[];
  virtual: AbsolutePath2 | null;
  setVirtual: (path: AbsolutePath2 | null) => void;
} | null>(null);

export function useFileTreeMenuContext() {
  const ctx = React.useContext(FileTreeMenuContext);
  if (!ctx) {
    throw new Error("useFileTreeMenuContext must be used within a FileTreeMenuContextProvider");
  }
  return ctx;
}
export const FileTreeMenuContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { filePath } = Workspace.parseWorkspacePath(pathname);
  const [editing, setEditing] = React.useState<AbsolutePath2 | null>(null);
  const [editType, setEditType] = React.useState<"rename" | "new">("rename");
  const [focused, setFocused] = React.useState<AbsolutePath2 | null>(filePath ?? null);
  const [virtual, setVirtual] = React.useState<AbsolutePath2 | null>(null);
  const [dragOver, setDragOver] = React.useState<AbsolutePath2 | null>(null);
  const [selectedRange, setSelectedRange] = React.useState<string[]>([]);

  const resetEditing = useCallback(() => {
    setEditing(null);
    setEditType("rename");
    // setFocused(null);
    setVirtual(null);
  }, []);

  const resetSelects = useCallback(() => {
    // setFocused(null);
    console.log("resetSelects called");
    setSelectedRange([]);
  }, []);
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
        dragOver,
        setDragOver,

        setFocused,
        editType,
        setEditType,
        focused,
        resetSelects,
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
