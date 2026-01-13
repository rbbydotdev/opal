// @see https://git-scm.com/docs/git-rev-parse.html#_specifying_revisions
const abbreviateRx = new RegExp("^refs/(heads/|tags/|remotes/)?(.*)");

export function gitAbbreviateRef(ref: string) {
  const match = abbreviateRx.exec(ref);
  if (match) {
    if (match[1] === "remotes/" && ref.endsWith("/HEAD")) {
      return match[2]!.slice(0, -5);
    } else {
      return match[2]!;
    }
  }
  return ref!;
}

/**
 * Check if a ref is a shorthand remote ref (e.g., "origin/main")
 */
export function isRemoteRefShorthand(ref: string): boolean {
  return ref.includes("/") && !ref.startsWith("refs/");
}

/**
 * Parse a shorthand remote ref (e.g., "origin/main") into remote and branch parts
 * Returns null if not a valid remote ref shorthand
 */
export function parseRemoteRefShorthand(ref: string): { remote: string; branch: string } | null {
  if (!isRemoteRefShorthand(ref)) {
    return null;
  }

  const slashIndex = ref.indexOf("/");
  const remote = ref.slice(0, slashIndex);
  const branch = ref.slice(slashIndex + 1);

  return { remote, branch };
}

/**
 * Get the remote name from a full remote ref (e.g., "refs/remotes/origin/main" -> "origin")
 */
export function getRemoteNameFromRef(ref: string): string | null {
  if (!ref.startsWith("refs/remotes/")) {
    return null;
  }

  const parts = ref.slice("refs/remotes/".length).split("/");
  return parts[0] || null;
}

/**
 * Get the branch name from a full remote ref (e.g., "refs/remotes/origin/main" -> "main")
 */
export function getBranchNameFromRemoteRef(ref: string): string | null {
  if (!ref.startsWith("refs/remotes/")) {
    return null;
  }

  const parts = ref.slice("refs/remotes/".length).split("/");
  return parts.slice(1).join("/") || null;
}
