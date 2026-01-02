import { stripLeadingSlash } from "@/lib/paths2";

export function getRepoInfo(importPath: string, defaults: { branch?: string } = { branch: "main" }) {
  const [owner, repo, branch, dir = "/"] = stripLeadingSlash(importPath).split("/");
  return {
    owner,
    repo,
    branch: branch || defaults.branch || undefined,
    dir,
  };
}
