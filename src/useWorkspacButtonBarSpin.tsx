import { useLocalStorage } from "@/features/local-storage/useLocalStorage";

export function useWorkspacButtonBarSpin() {
  return useLocalStorage("WorkspaceButtonBar/spin", false);
}
