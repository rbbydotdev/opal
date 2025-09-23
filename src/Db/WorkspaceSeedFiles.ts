import globalSeedCss from "./global-seed.css?raw";
// import { historyMarkdown } from "@/components/Editor/history/historyMarkdownFile";
// import recipeSeedMd from "./recipe-seed.md?raw";

export const WorkspaceSeedFiles: Record<string, string | Promise<string>> = {
  // "/welcome.md": historyMarkdown("# Welcome to your new workspace!"),
  // "/recipe.md": recipeSeedMd,
  "/global.css": globalSeedCss,
};
