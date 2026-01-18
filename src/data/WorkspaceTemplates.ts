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
  // TEMPORARILY DISABLED - 11ty functionality has bugs, hiding until fixed
  // {
  //   id: "book",
  //   name: "Book",
  //   description: "11ty-based book with collections, data cascade, and table of contents",
  //   seedFiles: {
  //     "/index.md": DefaultFile.EleventyBookIndex(),
  //     "/_includes/book-layout.njk": DefaultFile.EleventyBookLayout(),
  //     "/_pages/chapter-1.md": DefaultFile.EleventyBookPage("Chapter 1: Introduction", 1),
  //     "/_pages/chapter-2.md": DefaultFile.EleventyBookPage("Chapter 2: Getting Started", 2),
  //     "/_pages/chapter-3.md": DefaultFile.EleventyBookPage("Chapter 3: Advanced Topics", 3),
  //     "/_data/site.json": DefaultFile.EleventyBookSiteData(),
  //     "/global.css": globalSeedCss,
  //   },
  //   navigate: "/index.md",
  //   buildStrategy: "eleventy",
  // },
  // {
  //   id: "blog",
  //   name: "Blog",
  //   description: "11ty-based blog with collections, layouts, and front matter",
  //   seedFiles: {
  //     "/index.md": DefaultFile.EleventyBlogIndex(),
  //     "/_includes/blog-index.njk": DefaultFile.EleventyBlogIndexLayout(),
  //     "/_includes/post-layout.njk": DefaultFile.EleventyBlogPostLayout(),
  //     "/posts/welcome.md": DefaultFile.EleventyBlogPost("Welcome to My Blog", "Get started with this Eleventy-powered blog"),
  //     "/posts/getting-started.md": DefaultFile.EleventyBlogPost(
  //       "Getting Started with Eleventy",
  //       "Learn how to use Eleventy for your blog"
  //     ),
  //     "/_data/site.json": DefaultFile.EleventyBlogSiteData(),
  //     "/global.css": globalSeedCss,
  //   },
  //   navigate: "/index.md",
  //   buildStrategy: "eleventy",
  // },
];

export const DefaultTemplate = WORKSPACE_TEMPLATES.find((t) => t.id === "blank")!;

export function getTemplateById(id: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((template) => template.id === id);
}

export function getDefaultTemplate(): WorkspaceTemplate {
  return WORKSPACE_TEMPLATES[0]!; // blank template
}
