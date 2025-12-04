import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useWorkspacButtonBarSpin() {
  return useLocalStorage("WorkspaceButtonBar/spin", false);
}
