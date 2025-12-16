import { stripTrailingSlash } from "@/lib/paths2";
import { Octokit } from "@octokit/core";

export function OctokitClient(params: ConstructorParameters<typeof Octokit>[0], corsProxy?: string) {
  const apiBaseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/api.github.com` : undefined;
  return new Octokit({
    ...params,
    baseUrl: apiBaseUrl,
  });
}
