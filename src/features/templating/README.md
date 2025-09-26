# Templating Feature

This feature provides a clean, organized templating system using Eta (a modern EJS alternative) with full workspace integration.

## Features

- **Image Support**: Automatic access to all workspace images with URLs
- **File Tree Access**: Complete workspace file tree available in templates
- **Template Includes**: Support for template partials and includes from workspace filesystem
- **Live Editing**: Real-time preview updates as you edit templates
- **Error Handling**: Clear error display with stack traces for debugging

## Usage

### Basic Template

```eta
<!DOCTYPE html>
<html>
<head>
    <title><%= it.data?.title || 'My Page' %></title>
</head>
<body>
    <h1>Hello <%= it.data?.name || 'World' %>!</h1>
    
    <!-- Access workspace info -->
    <p>Workspace: <%= it.workspace.name %></p>
    
    <!-- Display images -->
    <% if (it.images && it.images.length > 0) { %>
    <h2>Images:</h2>
    <% it.images.forEach(function(img) { %>
        <img src="<%= img.url %>" alt="<%= img.name %>" style="max-width: 200px;">
    <% }); %>
    <% } %>
</body>
</html>
```

### Template Includes

Create a header template (`/templates/header.eta`):
```eta
<header>
    <h1><%= it.title || 'My Site' %></h1>
    <nav>
        <a href="#home">Home</a>
        <a href="#about">About</a>
    </nav>
</header>
```

Include it in your main template:
```eta
<!DOCTYPE html>
<html>
<head>
    <title><%= it.data?.title || 'My Page' %></title>
</head>
<body>
    <%~ include('./templates/header', { title: 'My Website' }) %>
    
    <main>
        <p>Welcome to my site!</p>
    </main>
</body>
</html>
```

## Available Data

Templates automatically receive:

- `it.data`: Custom data passed to the template
- `it.images`: Array of workspace images with `{path, url, name}` (url is direct path, handled by service worker)
- `it.fileTree`: Array of workspace files with `{path, name, type}`
- `it.workspace`: Workspace info with `{name, id}`

## Classes

### EtaRenderer
Core rendering engine with workspace integration.

### TemplateManager
High-level manager for template operations:
- `renderTemplate(path, data)`: Render a template file
- `renderString(content, data)`: Render template string
- `getTemplateFiles()`: List all template files
- `createTemplate(path, content)`: Create new template

## File Extensions

Supports `.eta`, `.ejs`, and `.html` files for templating.