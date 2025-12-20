import { useFileContents } from "@/context/useFileContents";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import matter from "gray-matter";
import { createContext, useContext, useMemo } from "react";

class Document {
  _data: Record<string, any> = {};
  _content: string = "";
}
const defaultDocument: {
  data: Record<string, any>;
  contents: string | null;
  hotContents: string | null;
  updateDebounce: (content: string | null) => void;
  updateImmediate: (content: string) => void;
} = { data: {}, contents: "", hotContents: "", updateDebounce: () => {}, updateImmediate: () => {} };
const CurrentDocumentContext = createContext(defaultDocument);

export const CurrentDocumentProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentWorkspace } = useWorkspaceContext();
  const { path } = useWorkspaceRoute();
  const { hotContents, contents, updateDebounce, updateImmediate } = useFileContents({
    currentWorkspace,
    path,
  });

  const documentData = useMemo(() => {
    return matter(hotContents || "");
  }, [hotContents]);

  return (
    <CurrentDocumentContext.Provider
      value={{
        data: documentData.data as Record<string, any>,
        hotContents,
        contents,
        updateDebounce,
        updateImmediate,
      }}
    >
      {children}
    </CurrentDocumentContext.Provider>
  );
};

export const useCurrentDocument = () => {
  const context = useContext(CurrentDocumentContext);
  if (!context) {
    throw new Error("useCurrentDocument must be used within a CurrentDocumentProvider");
  }
  return context;
};
