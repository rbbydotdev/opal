import yaml from "js-yaml";
import { Root, Yaml } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";

const frontmatterRegex = /^---\n[\s\S]*?\n---\n?/;

export function getMarkdownData(markdown: string) {
  // Parse the Markdown to MDAST
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);

  const tree = processor.parse(markdown) as Root;

  // Find the YAML node in the AST
  const yamlNode = tree.children.find((node) => node.type === "yaml") as Yaml | undefined;

  return yamlNode ? (yaml.load(yamlNode.value) as Record<string, unknown>) : {};
}
export function setFrontmatter(markdown: string, data: Record<string, unknown>): string {
  // Serialize the data to YAML
  const yamlString = yaml.dump(data).trimEnd();

  const newFrontmatter = `---\n${yamlString}\n---\n`;

  if (frontmatterRegex.test(markdown)) {
    // Replace existing front matter
    return markdown.replace(frontmatterRegex, newFrontmatter);
  } else {
    // Insert at the top
    return newFrontmatter + markdown.replace(/^\s+/, "");
  }
}
export function stripFrontmatter(markdown: string): string {
  // Regex to match YAML front matter at the start of the file
  return markdown.replace(frontmatterRegex, "");
}

export function mergeFrontmatter(markdown: string, data: Record<string, unknown>): string {
  const existingData = getMarkdownData(markdown);
  const mergedData = { ...existingData, ...data };
  return setFrontmatter(markdown, mergedData);
}
