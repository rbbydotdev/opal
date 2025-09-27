import globalSeedCss from "@/seedfiles/global-seed.css?raw";
import graymatter from "gray-matter";
import { nanoid } from "nanoid";
export type WorkspaceTemplate = {
  id: string;
  name: string;
  description: string;
  seedFiles: Record<string, string | Promise<string> | (() => string | Promise<string>)>;
};

const blogWelcomeMarkdown = `# Welcome to your Blog

This is a basic blog workspace with some starter files to help you get started.

## Getting Started

1. Edit this file to customize your welcome message
2. Create new blog posts in the \`posts/\` directory
3. Customize your styles in \`styles/\` directory

## File Structure

- \`/index.md\` - Your main blog page
- \`/posts/\` - Directory for blog posts
- \`/styles/\` - Custom CSS styles
- \`/assets/\` - Images and other assets
`;

const blogIndexMarkdown = `# My Blog

Welcome to my personal blog! Here you'll find thoughts, tutorials, and updates.

## Recent Posts

- [Getting Started](posts/getting-started.md)
- [My First Post](posts/first-post.md)

## About

This blog is powered by a simple markdown-based system. Feel free to explore and customize!
`;

const blogFirstPostMarkdown = `# My First Blog Post

*Published: ${new Date().toLocaleDateString()}*

Welcome to my first blog post! This is where your journey begins.

## What's Next?

I plan to write about:

- Web development
- Programming tutorials
- Personal projects
- Technology trends

## Getting Started

To create a new post, simply add a new markdown file to the \`posts/\` directory.

Each post should start with a title (using \`#\`) and can include any markdown content you like.

---

*Thanks for reading!*
`;

const blogGettingStartedMarkdown = `# Getting Started with Your Blog

*Published: ${new Date().toLocaleDateString()}*

This post will help you understand how to use this blog workspace effectively.

## Creating New Posts

1. Navigate to the \`posts/\` directory
2. Create a new \`.md\` file with a descriptive name
3. Start with a title using \`#\`
4. Write your content in Markdown format

## Organizing Content

- Use the \`assets/\` folder for images and files
- Add custom styles in \`styles/blog.css\`
- Update the main \`index.md\` to link to new posts

## Markdown Tips

### Headers
Use \`#\`, \`##\`, \`###\` for different header levels.

### Lists
- Bullet points like this
- Are easy to create

### Code
\`\`\`javascript
console.log("Code blocks work great!");
\`\`\`

### Links
[Link to other posts](first-post.md) or [external sites](https://example.com).

## Next Steps

Start writing your own content and make this blog yours!
`;

const newMd = function (doc: string) {
  return graymatter.stringify(doc, { documentId: nanoid(), createdAt: new Date().toISOString() });
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
      "/welcome.md": newMd(blogWelcomeMarkdown),
      "/index.md": newMd(blogIndexMarkdown),
      "/posts/first-post.md": newMd(blogFirstPostMarkdown),
      "/posts/getting-started.md": newMd(blogGettingStartedMarkdown),
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
