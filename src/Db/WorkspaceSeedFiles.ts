import { historyMarkdown } from "@/components/Editor/history/historyMarkdownFile";

export const WorkspaceSeedFiles: Record<string, string | Promise<string>> = {
  "/welcome.md": historyMarkdown("# Welcome to your new workspace!"),
};
