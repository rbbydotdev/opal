import { DefaultFile } from "@/lib/DefaultFile";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import globalSeedCss from "@/seedfiles/global-seed.css?raw";
export type WorkspaceTemplate = {
  id: string;
  name: string;
  description: string;
  seedFiles: Record<string, string | Promise<string> | (() => Promise<string>)>;
  navigate?: string;
  buildStrategy?: BuildStrategy;
};

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "hello_world",
    name: "Hello World",
    description: "A simple starter workspace with a hello world markdown file",
    seedFiles: {
      "/index.md": DefaultFile.HelloWorld(),
      "/global.css": globalSeedCss,
    },
    navigate: "/index.md",
    buildStrategy: "freeform",
  },
  {
    id: "blank",
    name: "Blank",
    description: "Completely empty workspace with no files",
    seedFiles: {},
    buildStrategy: "freeform",
  },
  {
    id: "basic",
    name: "Basic",
    description: "Empty workspace with basic CSS styles",
    seedFiles: {
      "/global.css": globalSeedCss,
    },
    buildStrategy: "freeform",
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
      "/global.css": DefaultFile.GlobalCSS(),
    },
    buildStrategy: "blog",
  },
];

export const DefaultTemplate = WORKSPACE_TEMPLATES.find((t) => t.id === "blank")!;

export function getTemplateById(id: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((template) => template.id === id);
}

export function getDefaultTemplate(): WorkspaceTemplate {
  return WORKSPACE_TEMPLATES[0]!; // blank template
}
