/**
 * Returns the default EJS template content for new .ejs files
 */
export function getDefaultEjsTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= data.title || 'Document' %></title>
</head>
<body>
    <h1>Hello <%= data.name || 'World' %>!</h1>
    
    <h2>Files in workspace:</h2>
    <ul>
    <% fileTree.forEach(function(file) { %>
        <li><%= file.name %> (<%= file.type %>)</li>
    <% }); %>
    </ul>
    
    <% if (images.length > 0) { %>
    <h2>Images:</h2>
    <% images.forEach(function(img) { %>
        <img src="<%= img.url %>" alt="<%= img.name %>" style="max-width: 200px; margin: 10px;">
    <% }); %>
    <% } %>
</body>
</html>`;
}