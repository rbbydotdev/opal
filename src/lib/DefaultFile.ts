import { newMd } from "@/data/newMd";
import { AbsPath, basename, prefix } from "@/lib/paths2";
import globalSeedCss from "@/seedfiles/global-seed.css?raw";
import PicoCSS from "@/seedfiles/pico-seed.css?raw";

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
  PicoCSS: () => {
    return PicoCSS;
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

  Nunchucks: () => {
    return `<h1>Current date: {{ now() }}</h1>`;
  },

  Liquid: () => {
    return `<h1>Current date: {% now %}</h1>`;
  },

  JSON: () => {
    return `{}`;
  },

  Manifest: () => {
    return `{
  "version": 1,
  "type": "template",
  "navigate": "index.md"
}`;
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

  // 11ty Book template helpers
  EleventyBookLayout: () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }} | {{ site.title }}</title>
  <link rel="stylesheet" href="/global.css">
  <style>
    @media print {
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <article>
    <h1>{{ title }}</h1>
    {{ content }}
  </article>
</body>
</html>`;
  },

  EleventyBookIndex: () => {
    return `---
layout: book-layout.njk
title: My Book
permalink: /index.html
---

# Table of Contents

{% for page in collections.bookPages | sort(attribute="data.order") %}
<div class="toc-entry">
  <a href="{{ page.url }}">{{ loop.index }}. {{ page.data.title }}</a>
</div>
{% endfor %}

<div class="page-break"></div>

{% for page in collections.bookPages | sort(attribute="data.order") %}
<section class="book-page">
  <h2>{{ loop.index }}. {{ page.data.title }}</h2>
  {{ page.templateContent | safe }}
</section>
<div class="page-break"></div>
{% endfor %}`;
  },

  EleventyBookPage: (title?: string, order?: number) => {
    const pageTitle = title || "Chapter 1";
    const pageOrder = order || 1;
    return `---
layout: book-layout.njk
title: ${pageTitle}
tags: bookPages
order: ${pageOrder}
---

## Introduction

This is the beginning of ${pageTitle}. Write your content here using Markdown.

## Key Points

- Point one
- Point two
- Point three

## Conclusion

Summary of the chapter goes here.`;
  },

  EleventyBookSiteData: () => {
    return JSON.stringify(
      {
        title: "My Book",
        author: "Author Name",
        description: "A book built with Eleventy",
      },
      null,
      2
    );
  },

  // 11ty Blog template helpers
  EleventyBlogPostLayout: () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }} | {{ site.title }}</title>
  <link rel="stylesheet" href="/global.css">
</head>
<body>
  <header>
    <nav>
      <a href="/">← Back to Blog</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>{{ title }}</h1>
      {% if date %}
      <time datetime="{{ date | date: '%Y-%m-%d' }}">{{ date | date: '%B %d, %Y' }}</time>
      {% endif %}
      {% if tags %}
      <div class="tags">
        {% for tag in tags %}
          {% if tag != "posts" %}
          <span class="tag">{{ tag }}</span>
          {% endif %}
        {% endfor %}
      </div>
      {% endif %}
      <div class="content">
        {{ content }}
      </div>
    </article>
  </main>
</body>
</html>`;
  },

  EleventyBlogIndexLayout: () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ site.title }}</title>
  <link rel="stylesheet" href="/global.css">
</head>
<body>
  <header>
    <h1>{{ site.title }}</h1>
    <p>{{ site.description }}</p>
  </header>
  <main>
    {{ content }}
  </main>
  <footer>
    <p>&copy; {{ site.year }} {{ site.author }}</p>
  </footer>
</body>
</html>`;
  },

  EleventyBlogIndex: () => {
    return `---
layout: blog-index.njk
title: Blog
permalink: /index.html
---

## Recent Posts

{% for post in collections.posts | reverse %}
<article class="post-preview">
  <h3><a href="{{ post.url }}">{{ post.data.title }}</a></h3>
  <time datetime="{{ post.date | date: '%Y-%m-%d' }}">{{ post.date | date: '%B %d, %Y' }}</time>
  {% if post.data.excerpt %}
  <p>{{ post.data.excerpt }}</p>
  {% endif %}
  <a href="{{ post.url }}">Read more →</a>
</article>
{% endfor %}`;
  },

  EleventyBlogPost: (title?: string, excerpt?: string) => {
    const postTitle = title || "My First Post";
    const postExcerpt = excerpt || "This is my first blog post using Eleventy!";
    const today = new Date().toISOString().split("T")[0];
    return `---
layout: post-layout.njk
title: ${postTitle}
date: ${today}
tags:
  - posts
  - getting-started
excerpt: ${postExcerpt}
---

## Welcome!

This is your first blog post built with Eleventy. You can write your content here using Markdown.

## Features

- **Collections**: Posts are automatically grouped using the \`posts\` tag
- **Layouts**: This post uses the \`post-layout.njk\` layout
- **Front Matter**: Metadata like title, date, and tags are defined at the top
- **Markdown**: Write your content in clean, simple Markdown

## Next Steps

1. Create more posts in the \`posts/\` directory
2. Customize the layouts in \`_includes/\`
3. Add global data in \`_data/\`
4. Build your site!

Happy blogging!`;
  },

  EleventyBlogSiteData: () => {
    return JSON.stringify(
      {
        title: "My Eleventy Blog",
        author: "Your Name",
        description: "A blog built with Eleventy",
        year: new Date().getFullYear(),
      },
      null,
      2
    );
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

    if (pathStr.endsWith(".njk") || pathStr.endsWith(".nunjucks")) {
      return DefaultFile.Nunchucks();
    }

    if (pathStr.endsWith(".liquid")) {
      return DefaultFile.Liquid();
    }

    if (pathStr.endsWith(".json")) {
      return DefaultFile.JSON();
    }

    return DefaultFile.Text();
  },
};

// Legacy export for compatibility
