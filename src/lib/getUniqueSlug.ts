export function getUniqueSlug(base: string, existing: string[]): string {
  const existingSet = new Set(existing);

  // First check if the base itself is unique
  if (!existingSet.has(base)) {
    return base;
  }

  // Remove trailing dash and numbers (e.g., "foo-2" -> "foo")
  const name = base.replace(/-\d+$/, "");
  let n = 1;

  let candidate = `${name}-${n}`;
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
  // First check if the base itself is unique
  if (!(await existing(base))) {
    return base;
  }

  // Remove trailing dash and numbers (e.g., "foo-2" -> "foo")
  const name = base.replace(/-\d+$/, "");
  let n = 1;

  let candidate = `${name}-${n}`;
  while (await existing(candidate)) {
    n++;
    candidate = `${name}-${n}`;
  }
  return candidate;
}
