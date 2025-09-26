/**
 * Returns the default ETA template content for new .ejs/.eta files
 */
export function getDefaultEjsTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= it.data?.title || 'Document' %></title>
</head>
<body>
    <h1>Hello <%= it.data?.name || 'World' %>!</h1>
    
    <% if (it.workspace) { %>
    <p><strong>Workspace:</strong> <%= it.workspace.name %> (ID: <%= it.workspace.id %>)</p>
    <% } %>
    
    <% if (it.images && it.images.length > 0) { %>
    <h2>Images in workspace:</h2>
    <div class="image-gallery" style="display: flex; flex-wrap: wrap; gap: 10px;">
    <% it.images.forEach(function(img) { %>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
            <img src="<%= img.url %>" alt="<%= img.name %>" style="max-width: 200px; max-height: 200px; object-fit: contain;">
            <p style="margin: 5px 0 0 0; font-size: 0.8em;"><%= img.name %></p>
        </div>
    <% }); %>
    </div>
    <% } %>
    
    <% if (it.fileTree && it.fileTree.length > 0) { %>
    <h2>Files in workspace:</h2>
    <ul>
    <% it.fileTree.forEach(function(file) { %>
        <li><strong><%= file.name %></strong> (<%= file.type %>)</li>
    <% }); %>
    </ul>
    <% } %>
    
    <hr style="margin: 20px 0;">
    <p><em>This template is powered by Eta and has access to all workspace data including images and file tree.</em></p>
    <p><em>You can use template includes like: <code>&lt;%~ include('./other-template') %&gt;</code></em></p>
</body>
</html>`;
}