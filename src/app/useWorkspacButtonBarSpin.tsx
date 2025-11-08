import useLocalStorage2 from "@/hooks/useLocalStorage2";

export function useWorkspacButtonBarSpin() {
  return useLocalStorage2("WorkspaceButtonBar/spin", false);
}
