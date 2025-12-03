import { newMd } from "@/data/newMd";
import { AbsPath, basename, prefix } from "@/lib/paths2";
import globalSeedCss from "@/seedfiles/global-seed.css?raw";

export const DefaultFile = {
  MarkdownFromPath: (path: AbsPath) => {
    return newMd(`# ${prefix(path)}`);
  },
  Markdown: (title?: string) => {
    const content = title || "# New Document";
    return newMd(content);
  },

  CSS: (filename?: string) => {
    const name = filename ? basename(filename as AbsPath) : "styles.css";
    return `/* ${name} */\n`;
  },

  GlobalCSS: () => {
    return globalSeedCss;
  },

  HTML: () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>    
    <h1>Hello, World!</h1>
</body>
</html>`;
  },

  EJS: () => {
    return `<h1>current date: <%= it.date %></h1>`;
  },

  Mustache: () => {
    return `<h1>Current date: {{helpers.now}}</h1>`;
  },

  Text: () => {
    return "";
  },

  // Blog template helpers
  BlogWelcome: () => {
    return newMd(`# Welcome to your Blog

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
`);
  },

  BlogIndex: () => {
    return newMd(`# My Blog

Welcome to my personal blog! Here you'll find thoughts, tutorials, and updates.

## Recent Posts

- [Getting Started](posts/getting-started.md)
- [My First Post](posts/first-post.md)

## About

This blog is powered by a simple markdown-based system. Feel free to explore and customize!
`);
  },

  BlogPost: (title?: string) => {
    const postTitle = title || "My First Blog Post";
    return newMd(`# ${postTitle}

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
`);
  },

  HelloWorld: () => {
    return newMd(`# Hello, World!

This is your first markdown file. You can edit this content to get started.

## Features

- Write in **Markdown**
- Create multiple files
- Organize your content

Happy writing!
`);
  },

  BlogGettingStarted: () => {
    return newMd(`# Getting Started with Your Blog

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
`);
  },

  fromPath: (path: AbsPath, title?: string): string => {
    const pathStr = path.toString();

    if (pathStr.endsWith(".md") || pathStr.endsWith(".markdown")) {
      return title ? DefaultFile.Markdown(title) : DefaultFile.MarkdownFromPath(path);
    }

    if (pathStr.endsWith(".css")) {
      return DefaultFile.CSS(basename(path));
    }

    if (pathStr.endsWith(".html") || pathStr.endsWith(".htm")) {
      return DefaultFile.HTML();
    }

    if (pathStr.endsWith(".ejs") || pathStr.endsWith(".eta")) {
      return DefaultFile.EJS();
    }

    if (pathStr.endsWith(".mustache")) {
      return DefaultFile.Mustache();
    }

    return DefaultFile.Text();
  },
};

// Legacy export for compatibility
const TemplateDefaultContents = {
  ejs: DefaultFile.EJS(),
  mustache: DefaultFile.Mustache(),
  html: DefaultFile.HTML(),
};
