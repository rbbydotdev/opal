import { historyMarkdown } from "@/components/Editor/history/historyMarkdownFile";
import globalSeedCss from "./global-seed.css?raw";
import recipeSeedMd from "./recipe-seed.md?raw";

export const WorkspaceSeedFiles: Record<string, string | Promise<string>> = {
  "/welcome.md": historyMarkdown("# Welcome to your new workspace!"),
  "/global.css": globalSeedCss,
  "/recipe.md": recipeSeedMd,
};
