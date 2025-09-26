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
    <h1>Hello <%= it.helpers.capitalize(it.data?.name || 'world') %>!</h1>
    
    <% if (it.workspace) { %>
    <p><strong>Workspace:</strong> <%= it.workspace.name %> (ID: <%= it.workspace.id %>)</p>
    <p><strong>Generated:</strong> <%= it.helpers.formatDate(it.helpers.now(), 'MM/DD/YYYY HH:mm') %></p>
    <% } %>
    
    <% if (it.images && it.images.length > 0) { %>
    <h2>Images in workspace (<%= it.helpers.length(it.images) %> total):</h2>
    <div class="image-gallery" style="display: flex; flex-wrap: wrap; gap: 10px;">
    <% it.helpers.take(it.images, 6).forEach(function(img) { %>
        <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
            <img src="<%= img.url %>" alt="<%= img.name %>" style="max-width: 200px; max-height: 200px; object-fit: contain;">
            <p style="margin: 5px 0 0 0; font-size: 0.8em;"><%= it.helpers.truncate(img.name, 20) %></p>
            <p style="margin: 2px 0 0 0; font-size: 0.7em; color: #666;">
                Type: <%= it.helpers.uppercase(it.helpers.getFileExtension(img.path)) %>
            </p>
        </div>
    <% }); %>
    <% if (it.helpers.length(it.images) > 6) { %>
        <p style="width: 100%; text-align: center; color: #666; font-style: italic;">
            ... and <%= it.helpers.subtract(it.helpers.length(it.images), 6) %> more images
        </p>
    <% } %>
    </div>
    <% } %>
    
    <% if (it.fileTree && it.fileTree.length > 0) { %>
    <h2>Files in workspace (<%= it.helpers.length(it.fileTree) %> total):</h2>
    <ul>
    <% it.helpers.take(it.fileTree, 10).forEach(function(file) { %>
        <li>
            <strong><%= it.helpers.truncate(file.name, 30) %></strong> 
            (<%= file.type %><% if (file.type === 'file') { %>, .<%= it.helpers.getFileExtension(file.path) %><% } %>)
        </li>
    <% }); %>
    <% if (it.helpers.length(it.fileTree) > 10) { %>
        <li style="color: #666; font-style: italic;">... and <%= it.helpers.subtract(it.helpers.length(it.fileTree), 10) %> more files</li>
    <% } %>
    </ul>
    <% } %>
    
    <hr style="margin: 20px 0;">
    <h3>Available Helper Functions:</h3>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 0.9em;">
        <p><strong>String:</strong> capitalize, lowercase, uppercase, truncate, slugify</p>
        <p><strong>Array:</strong> first, last, take, skip, length</p>
        <p><strong>Date:</strong> formatDate, now</p>
        <p><strong>File:</strong> getFileExtension, getFileName, getFileSize</p>
        <p><strong>Math:</strong> add, subtract, multiply, divide, round</p>
        <p><strong>Utility:</strong> json, escape, equals</p>
        <p><strong>Markdown:</strong> importMarkdown, importMarkdownSync</p>
    </div>
    <p><em>Example: <code>&lt;%= it.helpers.capitalize('hello world') %&gt;</code> → "Hello world"</em></p>
    <p><em>You can use template includes like: <code>&lt;%~ include('./other-template') %&gt;</code></em></p>
    
    <h3>🚀 New: Markdown Import</h3>
    <p>Import markdown files with frontmatter parsing:</p>
    <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 0.9em;">
        <p><code>&lt;% const md = await it.helpers.importMarkdown('path/to/file.md'); %&gt;</code></p>
        <p><code>&lt;%= md.data.title %&gt;</code> ← frontmatter data</p>
        <p><code>&lt;%= md.content %&gt;</code> ← markdown content</p>
        <p><code>&lt;%= md.raw %&gt;</code> ← raw file content</p>
    </div>
</body>
</html>`;
}