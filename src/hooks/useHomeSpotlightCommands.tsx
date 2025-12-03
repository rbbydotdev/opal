import type { CmdMap } from "@/components/spotlight/SpotlightSearch";
import { toast } from "@/components/ui/sonner";
import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { ThemePreview } from "@/features/theme/ThemePreview";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

const NewCmdExec = (exec: (context: Record<string, unknown>, abort: () => void) => void | Promise<void>) => ({
  exec,
  type: "exec" as const,
});

const NewCmdPrompt = (name: string, description: string) => ({
  name,
  description,
  type: "prompt" as const,
});

const NewCmdSelect = (
  name: string,
  description: string,
  options: string[],
  renderItem?: (option: string) => React.ReactNode
) => ({
  name,
  description,
  options,
  type: "select" as const,
  renderItem,
});

export function useHomeSpotlightCommands() {
  const navigate = useNavigate();
  const { mode, setTheme, setMode, availableThemes, themeName: currentTheme } = useTheme();
  const cmdMap = useMemo(
    () => ({
      "New Workspace": [
        NewCmdExec(() => {
          void navigate({
            to: "/newWorkspace",
          });
        }),
      ],
      Home: [
        NewCmdExec(() => {
          void navigate({
            to: "/",
          });
        }),
      ],
      "Create Workspace": [
        NewCmdPrompt("workspace_name", "Enter workspace name"),
        NewCmdExec(async (context) => {
          const name = context.workspace_name as string;
          if (!name) {
            console.warn("No workspace name provided");
            return;
          }
          try {
            const workspace = await WorkspaceDAO.CreateNew({ name });
            toast({
              title: "Workspace created",
              description: `Created workspace: ${workspace.name}`,
              type: "success",
              position: "top-right",
            });
            void navigate({ to: workspace.href });
          } catch (error) {
            console.error("Failed to create workspace:", error);
            toast({
              title: "Error creating workspace",
              description: "Failed to create workspace. Please try again.",
              type: "error",
              position: "top-right",
            });
          }
        }),
      ],

      "Toggle Light/Dark Mode": [
        NewCmdExec(() => {
          setMode(mode === "light" ? "dark" : "light");
          toast({
            title: `Switched to ${mode === "light" ? "dark" : "light"} mode`,
            type: "success",
            position: "top-right",
          });
        }),
      ],

      "Select Theme": [
        NewCmdSelect("theme", "Select a theme", availableThemes, (themeName) => (
          <ThemePreview themeName={themeName} currentTheme={currentTheme} />
        )),
        NewCmdExec(async (context) => {
          const selectedTheme = context.theme as string;
          setTheme(selectedTheme);
          toast({
            title: `Applied theme: ${selectedTheme}`,
            type: "success",
            position: "top-right",
          });
        }),
      ],
    }),
    [availableThemes, currentTheme, mode, navigate, setMode, setTheme]
  ) as CmdMap;

  return { cmdMap, commands: Object.keys(cmdMap) };
}
