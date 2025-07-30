export function getUniqueSlug(base: string, existing: string[]): string {
  // Remove trailing dash and numbers (e.g., "foo-2" -> "foo")
  const name = base.replace(/-\d+$/, "");
  let n = 0;

  // If base had a numeric suffix, start from that number + 1
  if (name.length !== base.length) {
    n = parseInt(base.slice(name.length + 1), 10) + 1;
  }

  let candidate = `${name}${n > 0 ? `-${n}` : ""}`;
  while (existing.includes(candidate)) {
    n++;
    candidate = `${name}-${n}`;
  }
  return candidate;
}

// getUniqueSlug
