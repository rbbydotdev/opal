import { Workspace } from "@/workspace/Workspace";
import { Context } from "hono";

// Workspace extractors - pure functions for different sources
const extractWorkspaceFromUrl = (url: string): string | null => {
  try {
    const urlResult = Workspace.parseWorkspacePath(url);
    return urlResult.workspaceName;
  } catch {
    return null;
  }
};
const extractWorkspaceFromReferrer = (referrer: string | undefined): string | null => {
  if (!referrer) return null;
  try {
    // Try referrer search params first
    const referrerUrl = new URL(referrer);
    const fromSearchParams = referrerUrl.searchParams.get("workspaceName");
    if (fromSearchParams) return fromSearchParams;

    // Try referrer path
    const referrerResult = Workspace.parseWorkspacePath(referrer);
    return referrerResult.workspaceName;
  } catch {
    return null;
  }
};
// Workspace validator middleware factory
const workspaceValidator = (
  options: { required?: boolean } = {},
  ...extractors: Array<(c: Context) => string | null>
) => {
  return async (c: Context, next: () => Promise<void>) => {
    let workspaceName: string | null = null;
    for (let i = 0; i < extractors.length; i++) {
      const extractor = extractors[i]!;
      workspaceName = extractor(c);
      if (workspaceName) break;
    }
    if (options.required && !workspaceName) {
      return c.json({ error: "Workspace name could not be determined" }, 400);
    }
    c.set("workspaceName", workspaceName);
    await next();
  };
};
// Individual extractor functions for composition (only used by image/CSS routes)
const extractFromSearchParams = (c: Context) => {
  const url = new URL(c.req.url);
  return url.searchParams.get("workspaceName");
};
const extractFromUrlPath = (c: Context) => extractWorkspaceFromUrl(c.req.url);
const extractFromReferrer = (c: Context) => {
  // In service worker, referrer comes from the request object, not headers
  const referrer = c.req.raw.referrer;
  console.log(`Extracting from referrer: ${referrer}`);
  return extractWorkspaceFromReferrer(referrer);
};
export const resolveWorkspaceFromQueryOrContext = workspaceValidator(
  { required: true },
  extractFromSearchParams,
  extractFromUrlPath,
  extractFromReferrer
);
