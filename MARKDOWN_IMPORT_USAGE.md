# Markdown Import for ETA Templates

You can now import markdown files with frontmatter parsing directly in your ETA templates! This feature uses gray-matter to parse markdown files and extract both the content and frontmatter data.

## Usage

### Basic Import

```html
<%
// Import a markdown file
const myPost = await it.helpers.importMarkdown('src/app/kitchen-sink.md');
%>

<h1><%= myPost.data.title %></h1>
<div class="content">
    <%= myPost.content %>
</div>
```

### Available Properties

When you import a markdown file, you get an object with three properties:

- `content` - The markdown content without frontmatter
- `data` - The frontmatter parsed as a JavaScript object
- `raw` - The original file content including frontmatter

### Advanced Usage

```html
<%
const blogPost = await it.helpers.importMarkdown('posts/my-blog-post.md');
%>

<!DOCTYPE html>
<html>
<head>
    <title><%= blogPost.data.title || 'Blog Post' %></title>
    <% if (blogPost.data.description) { %>
    <meta name="description" content="<%= blogPost.data.description %>">
    <% } %>
</head>
<body>
    <article>
        <header>
            <h1><%= blogPost.data.title %></h1>
            <% if (blogPost.data.author) { %>
            <p>By <%= blogPost.data.author %></p>
            <% } %>
            <% if (blogPost.data.date) { %>
            <time><%= it.helpers.formatDate(blogPost.data.date) %></time>
            <% } %>
        </header>
        
        <div class="content">
            <pre><%= blogPost.content %></pre>
        </div>
        
        <% if (blogPost.data.tags && blogPost.data.tags.length > 0) { %>
        <footer>
            <div class="tags">
                <% blogPost.data.tags.forEach(tag => { %>
                <span class="tag"><%= tag %></span>
                <% }); %>
            </div>
        </footer>
        <% } %>
    </article>
</body>
</html>
```

### Template Rendering

To use templates with markdown imports, use the new methods:

```typescript
// For template files
const html = await templateManager.renderTemplateWithMarkdown('/path/to/template.eta', data);

// For template strings
const html = await templateManager.renderStringWithMarkdown(templateString, data);

// Or with the renderer directly
const html = await etaRenderer.renderWithMarkdown(templateString, data);
```

### Example Markdown File

Your markdown files can have frontmatter like this:

```markdown
---
title: "My Blog Post"
author: "John Doe"
date: "2024-01-15"
tags: ["javascript", "web-development"]
description: "A great blog post about web development"
published: true
---

# This is the content

This is the actual markdown content that will be available as `content` property.

- Bullet point 1
- Bullet point 2

**Bold text** and *italic text*.
```

### Performance Notes

- Markdown files are cached after first import
- Use `renderWithMarkdown()` methods for automatic markdown detection and preloading
- The system automatically detects `importMarkdown()` calls in your templates and preloads them

### Error Handling

If a markdown file cannot be found or parsed, the import will throw an error that will be displayed in the rendered template with helpful error information.