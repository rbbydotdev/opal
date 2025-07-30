export function getUniqueSlug(base: string, existing: string[]): string {
  const existingSet = new Set(existing);
  // Remove trailing dash and numbers (e.g., "foo-2" -> "foo")
  const name = base.replace(/-\d+$/, "");
  let n = 0;

  // If base had a numeric suffix, start from that number + 1
  if (name.length !== base.length) {
    n = parseInt(base.slice(name.length + 1), 10) + 1;
  }

  let candidate = `${name}${n > 0 ? `-${n}` : ""}`;
  while (existingSet.has(candidate)) {
    n++;
    candidate = `${name}-${n}`;
  }
  return candidate;
}

export function getUniqueSlugIter(base: string, existing: Iterable<string>): string {
  // Collect all existing slugs into a Set for efficient lookup
  const existingSet = new Set(existing);

  // Remove trailing dash and numbers (e.g., "foo-2" -> "foo")
  const name = base.replace(/-\d+$/, "");
  let n = 0;

  // If base had a numeric suffix, start from that number + 1
  if (name.length !== base.length) {
    n = parseInt(base.slice(name.length + 1), 10) + 1;
  }

  let candidate = `${name}${n > 0 ? `-${n}` : ""}`;
  while (existingSet.has(candidate)) {
    n++;
    candidate = `${name}-${n}`;
  }
  return candidate;
}

export async function getUniqueSlugAsync(
  base: string,
  existing: (candidate: string) => Promise<boolean>
): Promise<string> {
  // Remove trailing dash and numbers (e.g., "foo-2" -> "foo")
  const name = base.replace(/-\d+$/, "");
  let n = 0;

  // If base had a numeric suffix, start from that number + 1
  if (name.length !== base.length) {
    n = parseInt(base.slice(name.length + 1), 10) + 1;
  }

  let candidate = `${name}${n > 0 ? `-${n}` : ""}`;
  while (await existing(candidate)) {
    n++;
    candidate = `${name}-${n}`;
  }
  return candidate;
}
