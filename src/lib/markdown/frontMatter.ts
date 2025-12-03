import graymatter from "gray-matter";

export function getMarkdownData(markdown: string) {
  return graymatter(markdown).data;
}
export function setFrontmatter(content: string, data: Record<string, unknown>): string {
  return graymatter.stringify(content, data);
}
export function stripFrontmatter(markdown: string): string {
  return graymatter(markdown).content;
}

export function mergeFrontmatter(markdown: string, data: Record<string, unknown>): string {
  const existingData = getMarkdownData(markdown);
  const mergedData = { ...existingData, ...data };
  return setFrontmatter(markdown, mergedData);
}
