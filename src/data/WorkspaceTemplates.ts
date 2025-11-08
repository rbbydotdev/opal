import { DefaultFile } from "@/lib/DefaultFile";
import globalSeedCss from "@/seedfiles/global-seed.css?raw";
export type WorkspaceTemplate = {
  id: string;
  name: string;
  description: string;
  seedFiles: Record<string, string | Promise<string>>;
};

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Completely empty workspace with no files",
    seedFiles: {},
  },
  {
    id: "basic",
    name: "Basic",
    description: "Empty workspace with basic CSS styles",
    seedFiles: {
      "/global.css": globalSeedCss,
    },
  },
  {
    id: "blog",
    name: "Blog",
    description: "A simple blog setup with posts, styles, and sample content",
    seedFiles: {
      "/welcome.md": DefaultFile.BlogWelcome(),
      "/index.md": DefaultFile.BlogIndex(),
      "/posts/first-post.md": DefaultFile.BlogPost(),
      "/posts/getting-started.md": DefaultFile.BlogGettingStarted(),
      "/global.css": globalSeedCss,
    },
  },
];

export const DefaultTemplate = WORKSPACE_TEMPLATES.find((t) => t.id === "blank")!;

export function getTemplateById(id: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((template) => template.id === id);
}

export function getDefaultTemplate(): WorkspaceTemplate {
  return WORKSPACE_TEMPLATES[0]!; // blank template
}
