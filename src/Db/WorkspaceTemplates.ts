import { WorkspaceSeedFiles } from "./WorkspaceSeedFiles";

export type WorkspaceTemplate = {
  id: string;
  name: string;
  description: string;
  seedFiles: Record<string, string | Promise<string>>;
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

const blogCss = `/* Blog-specific styles */
.blog-header {
  border-bottom: 2px solid var(--borderColor-default);
  margin-bottom: 2rem;
  padding-bottom: 1rem;
}

.blog-post {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.blog-post h1 {
  color: var(--fgColor-accent);
  margin-bottom: 0.5rem;
}

.blog-meta {
  color: var(--fgColor-muted);
  font-style: italic;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.blog-content {
  line-height: 1.6;
}

.blog-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--borderColor-muted);
}

.blog-nav a {
  color: var(--fgColor-accent);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid var(--borderColor-default);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.blog-nav a:hover {
  background-color: var(--bgColor-muted);
}

/* Responsive design */
@media (max-width: 768px) {
  .blog-post {
    padding: 1rem;
  }
  
  .blog-nav {
    flex-direction: column;
    gap: 0.5rem;
  }
}
`;

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty workspace with just basic CSS styles",
    seedFiles: WorkspaceSeedFiles,
  },
  {
    id: "blog",
    name: "Blog",
    description: "A simple blog setup with posts, styles, and sample content",
    seedFiles: {
      ...WorkspaceSeedFiles,
      "/welcome.md": blogWelcomeMarkdown,
      "/index.md": blogIndexMarkdown,
      "/posts/first-post.md": blogFirstPostMarkdown,
      "/posts/getting-started.md": blogGettingStartedMarkdown,
      "/styles/blog.css": blogCss,
    },
  },
];

export function getTemplateById(id: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((template) => template.id === id);
}

export function getDefaultTemplate(): WorkspaceTemplate {
  return WORKSPACE_TEMPLATES[0]!; // blank template
}
