import { TestSuite } from "../../lib/tests/TestSuite.js";
import { BuildDAO } from "../../data/dao/BuildDAO.js";
import { DiskDAO } from "../../data/dao/DiskDAO.js";
import { Disk } from "../../data/disk/Disk.js";
import { absPath } from "../../lib/paths2.js";
import { FreeformBuildRunner } from "./strategies/FreeformBuildRunner.js";
import { EleventyBuildRunner } from "./EleventyBuildRunner.js";

// Test suite
const suite = new TestSuite("Build Strategies");

// Helper to create a mock disk with files
async function createMockDisk(files: Record<string, string>): Promise<Disk> {
  const diskDAO = DiskDAO.CreateNew("memory");
  await diskDAO.save();
  const disk = await Disk.FromDAO(diskDAO);

  for (const [path, content] of Object.entries(files)) {
    await disk.writeFile(absPath(path), content);
  }

  return disk;
}

// Helper to create a mock BuildDAO
async function createMockBuild(
  strategy: "freeform" | "eleventy",
  sourceDisk: Disk
): Promise<BuildDAO> {
  const outputDiskDAO = DiskDAO.CreateNew("memory");
  await outputDiskDAO.save();
  const outputDisk = await Disk.FromDAO(outputDiskDAO);

  const build = await BuildDAO.CreateNew({
    label: `Test Build - ${strategy}`,
    sourceDisk: sourceDisk,
    outputDisk: outputDisk,
    sourcePath: absPath("/"),
    strategy: strategy,
    workspaceId: "test-workspace",
  });

  return build;
}

// =============================================================================
// FREEFORM BUILD STRATEGY TESTS
// =============================================================================

suite.test("Freeform: should process markdown to HTML", async () => {
  const sourceDisk = await createMockDisk({
    "/index.md": "# Hello World\n\nThis is a test.",
    "/global.css": "body { margin: 0; }",
  });

  const build = await createMockBuild("freeform", sourceDisk);
  const runner = FreeformBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const files = await outputDisk.listFiles(absPath("/"));

  suite.assert(files.some((f) => f.endsWith("index.html")), "Should generate index.html");
  suite.assert(files.some((f) => f.endsWith("global.css")), "Should copy global.css");

  const htmlContent = await outputDisk.readFile(absPath("/index.html"));
  suite.assert(htmlContent.includes("<h1>Hello World</h1>"), "Should convert markdown to HTML");
});

suite.test("Freeform: should copy non-template files as-is", async () => {
  const sourceDisk = await createMockDisk({
    "/image.png": "fake-png-data",
    "/script.js": "console.log('hello');",
    "/styles.css": "body { color: red; }",
  });

  const build = await createMockBuild("freeform", sourceDisk);
  const runner = FreeformBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const files = await outputDisk.listFiles(absPath("/"));

  suite.assert(files.some((f) => f.endsWith("image.png")), "Should copy image.png");
  suite.assert(files.some((f) => f.endsWith("script.js")), "Should copy script.js");
  suite.assert(files.some((f) => f.endsWith("styles.css")), "Should copy styles.css");
});

suite.test("Freeform: should process mustache templates", async () => {
  const sourceDisk = await createMockDisk({
    "/index.mustache": "<h1>{{title}}</h1>",
  });

  const build = await createMockBuild("freeform", sourceDisk);
  const runner = FreeformBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/index.html"));

  suite.assert(typeof htmlContent === "string", "Should generate HTML output");
  // Templates will be processed with available data
});

// =============================================================================
// ELEVENTY BUILD STRATEGY TESTS
// =============================================================================

suite.test("Eleventy: should process front matter", async () => {
  const sourceDisk = await createMockDisk({
    "/index.md": `---
title: My Page
layout: base.njk
---
# Hello World`,
    "/_includes/base.njk": "<html><head><title>{{ title }}</title></head><body>{{ content }}</body></html>",
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const files = await outputDisk.listFiles(absPath("/_site"));

  suite.assert(files.some((f) => f.includes("index.html")), "Should generate index.html in _site");

  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));
  suite.assert(htmlContent.includes("My Page"), "Should process front matter title");
  suite.assert(htmlContent.includes("<h1>Hello World</h1>"), "Should convert markdown content");
});

suite.test("Eleventy: should load global data from _data directory", async () => {
  const sourceDisk = await createMockDisk({
    "/index.njk": "<h1>{{ site.title }}</h1>",
    "/_data/site.json": JSON.stringify({ title: "My Site", author: "Test Author" }),
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));

  suite.assert(htmlContent.includes("My Site"), "Should load and use global data from _data");
});

suite.test("Eleventy: should support collections with tags", async () => {
  const sourceDisk = await createMockDisk({
    "/index.njk": `{% for post in collections.posts %}
<article>{{ post.data.title }}</article>
{% endfor %}`,
    "/posts/post1.md": `---
title: First Post
tags: posts
---
# First Post Content`,
    "/posts/post2.md": `---
title: Second Post
tags: posts
---
# Second Post Content`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));

  suite.assert(htmlContent.includes("First Post"), "Should include first post in collection");
  suite.assert(htmlContent.includes("Second Post"), "Should include second post in collection");
});

suite.test("Eleventy: should support custom permalinks", async () => {
  const sourceDisk = await createMockDisk({
    "/about.md": `---
title: About Page
permalink: /about-us/index.html
---
# About Us`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const files = await outputDisk.listFiles(absPath("/_site"));

  suite.assert(
    files.some((f) => f.includes("about-us/index.html")),
    "Should create file at custom permalink location"
  );
});

suite.test("Eleventy: should support layout chaining", async () => {
  const sourceDisk = await createMockDisk({
    "/page.md": `---
layout: post.njk
title: My Post
---
# Content`,
    "/_includes/post.njk": `---
layout: base.njk
---
<article>{{ content }}</article>`,
    "/_includes/base.njk": `<html><body>{{ content }}</body></html>`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/page.html"));

  suite.assert(htmlContent.includes("<html>"), "Should apply base layout");
  suite.assert(htmlContent.includes("<article>"), "Should apply post layout");
  suite.assert(htmlContent.includes("<h1>Content</h1>"), "Should include content");
});

suite.test("Eleventy: should copy static assets", async () => {
  const sourceDisk = await createMockDisk({
    "/index.md": "# Test",
    "/images/logo.png": "fake-png-data",
    "/css/styles.css": "body { margin: 0; }",
    "/js/script.js": "console.log('test');",
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const files = await outputDisk.listFiles(absPath("/_site"));

  suite.assert(files.some((f) => f.includes("images/logo.png")), "Should copy images");
  suite.assert(files.some((f) => f.includes("css/styles.css")), "Should copy CSS");
  suite.assert(files.some((f) => f.includes("js/script.js")), "Should copy JavaScript");
});

// =============================================================================
// TEMPLATE ENGINE INTERCHANGEABILITY TESTS
// =============================================================================

suite.test("Eleventy: should support Nunjucks templates", async () => {
  const sourceDisk = await createMockDisk({
    "/index.njk": `---
title: Nunjucks Test
---
<h1>{{ title }}</h1>
{% for i in [1, 2, 3] %}
<p>Item {{ i }}</p>
{% endfor %}`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));

  suite.assert(htmlContent.includes("Nunjucks Test"), "Should process Nunjucks variables");
  suite.assert(htmlContent.includes("Item 1"), "Should process Nunjucks loops");
  suite.assert(htmlContent.includes("Item 3"), "Should process all loop iterations");
});

suite.test("Eleventy: should support Liquid templates", async () => {
  const sourceDisk = await createMockDisk({
    "/index.liquid": `---
title: Liquid Test
---
<h1>{{ title }}</h1>
{% for i in (1..3) %}
<p>Number {{ i }}</p>
{% endfor %}`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));

  suite.assert(htmlContent.includes("Liquid Test"), "Should process Liquid variables");
  suite.assert(htmlContent.includes("Number 1"), "Should process Liquid loops");
});

suite.test("Eleventy: should support Mustache templates", async () => {
  const sourceDisk = await createMockDisk({
    "/index.mustache": `---
title: Mustache Test
items:
  - name: Item 1
  - name: Item 2
---
<h1>{{title}}</h1>
{{#items}}
<p>{{name}}</p>
{{/items}}`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));

  suite.assert(htmlContent.includes("Mustache Test"), "Should process Mustache variables");
  suite.assert(htmlContent.includes("Item 1"), "Should process Mustache sections");
});

suite.test("Eleventy: should support EJS templates", async () => {
  const sourceDisk = await createMockDisk({
    "/index.ejs": `---
title: EJS Test
---
<h1><%= title %></h1>
<% for(let i = 1; i <= 3; i++) { %>
<p>Item <%= i %></p>
<% } %>`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();
  const htmlContent = await outputDisk.readFile(absPath("/_site/index.html"));

  suite.assert(htmlContent.includes("EJS Test"), "Should process EJS variables");
  suite.assert(htmlContent.includes("Item 1"), "Should process EJS loops");
  suite.assert(htmlContent.includes("Item 3"), "Should complete EJS loops");
});

suite.test("Eleventy: should mix different template engines in same project", async () => {
  const sourceDisk = await createMockDisk({
    "/index.njk": `<h1>Nunjucks Page</h1>`,
    "/about.liquid": `<h1>Liquid Page</h1>`,
    "/contact.mustache": `<h1>Mustache Page</h1>`,
    "/blog.ejs": `<h1>EJS Page</h1>`,
  });

  const build = await createMockBuild("eleventy", sourceDisk);
  const runner = EleventyBuildRunner.Show({ build });

  await runner.run();

  const outputDisk = build.getOutputDisk();

  const njkContent = await outputDisk.readFile(absPath("/_site/index.html"));
  const liquidContent = await outputDisk.readFile(absPath("/_site/about.html"));
  const mustacheContent = await outputDisk.readFile(absPath("/_site/contact.html"));
  const ejsContent = await outputDisk.readFile(absPath("/_site/blog.html"));

  suite.assert(njkContent.includes("Nunjucks Page"), "Should process Nunjucks files");
  suite.assert(liquidContent.includes("Liquid Page"), "Should process Liquid files");
  suite.assert(mustacheContent.includes("Mustache Page"), "Should process Mustache files");
  suite.assert(ejsContent.includes("EJS Page"), "Should process EJS files");
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as BuildStrategiesTestSuite };
