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
- `it.helpers`: Comprehensive helper functions (see below)

## Helper Functions

Access helper functions via `it.helpers` in your templates:

### String Helpers
```eta
<%= it.helpers.capitalize('hello world') %>    <!-- "Hello world" -->
<%= it.helpers.uppercase('hello') %>           <!-- "HELLO" -->
<%= it.helpers.lowercase('HELLO') %>           <!-- "hello" -->
<%= it.helpers.truncate('long text', 10) %>    <!-- "long text..." -->
<%= it.helpers.slugify('Hello World!') %>      <!-- "hello-world" -->
```

### Array Helpers
```eta
<%= it.helpers.first(it.images) %>             <!-- First image -->
<%= it.helpers.last(it.images) %>              <!-- Last image -->
<%= it.helpers.length(it.images) %>            <!-- Array length -->
<% it.helpers.take(it.images, 3).forEach(...) %> <!-- First 3 items -->
<% it.helpers.skip(it.images, 2).forEach(...) %> <!-- Skip first 2 -->
```

### Date Helpers
```eta
<%= it.helpers.now() %>                        <!-- Current ISO date -->
<%= it.helpers.formatDate(new Date(), 'MM/DD/YYYY') %> <!-- "12/25/2023" -->
<%= it.helpers.formatDate(new Date(), 'DD/MM/YYYY HH:mm') %> <!-- "25/12/2023 14:30" -->
```

### File Helpers
```eta
<%= it.helpers.getFileName('/path/to/file.jpg') %>      <!-- "file.jpg" -->
<%= it.helpers.getFileExtension('/path/to/file.jpg') %> <!-- "jpg" -->
<%= it.helpers.getFileSize(1024) %>                    <!-- "1 KB" -->
```

### Image Helpers
```eta
<% it.helpers.filterImages(it.fileTree).forEach(...) %> <!-- Only image files -->
<% it.helpers.getImagesByType(it.images, 'jpg').forEach(...) %> <!-- Only JPG images -->
```

### Math Helpers
```eta
<%= it.helpers.add(5, 3) %>                    <!-- 8 -->
<%= it.helpers.round(3.14159, 2) %>            <!-- 3.14 -->
<%= it.helpers.divide(10, 3) %>                <!-- 3.33... -->
```

### Utility Helpers
```eta
<%= it.helpers.json(it.workspace) %>           <!-- JSON representation -->
<%= it.helpers.escape('<script>') %>           <!-- HTML escaped -->
<%= it.helpers.equals(a, b) %>                 <!-- Boolean comparison -->
```

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