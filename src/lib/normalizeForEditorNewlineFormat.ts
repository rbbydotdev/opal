export function normalizeForEditorNewlineFormat(original: string): string {
  // 1. Remove leading newline (if present)
  const text = original
    .replace(/^\n/, "")
    .replace(/\n{2,}/g, "\n")
    .normalize("NFKD");

  // 2. Split into lines
  let lines = text.split("\n");

  // 3. Remove four leading spaces from each line
  lines = lines.map((line) => line.replace(/^ {4}/, ""));

  // 4. Join lines, but insert an extra newline after the first line
  if (lines.length > 1) {
    return [
      lines[0],
      "", // This creates the double newline after the first line
      ...lines.slice(1),
    ].join("\n");
  } else {
    return lines[0] ?? "";
  }
}
