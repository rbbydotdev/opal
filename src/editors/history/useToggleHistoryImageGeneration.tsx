import { generateHtmlPreview } from "@/editors/history/EditViewImage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCallback } from "react";

export function useToggleHistoryImageGeneration() {
  const { storedValue, setStoredValue } = useLocalStorage("app/EditHistoryImageGeneration", false);
  const toggle = () => setStoredValue(!storedValue);

  const handleEditPreview = useCallback(
    (edit: any) => {
      if (!storedValue) return;
      return generateHtmlPreview(edit);
    },
    [storedValue]
  );
  return { isHistoryImageGenerationEnabled: storedValue, handleEditPreview, toggleHistoryImageGeneration: toggle };
}
