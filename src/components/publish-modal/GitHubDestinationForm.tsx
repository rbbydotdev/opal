import { useRemoteGitRepo, useRemoteGitRepoSearch } from "@/components/RemoteConnectionItem";
import {
  RepositoryCreationProvider,
  createGitHubAPICapabilities,
  createGitHubCapabilities,
} from "@/components/repository/RepositoryCreationProvider";
import {
  RepositoryVisibility,
  RepositoryVisibilitySelector,
  getVisibilityIcon,
} from "@/components/repository/RepositoryVisibilitySelector";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthGithubAgent, coerceRepoToName } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { absPath } from "@/lib/paths2";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { useState } from "react";
import { flushSync } from "react-dom";
import { UseFormReturn } from "react-hook-form";
import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "./RemoteResourceField";
import { createValidationHelper, handleNotFoundError, updateFormData } from "./ValidationHelpers";

// https://github.com/rbbydotdev/test123/settings/pages
// should set up gear link to assist and remind user to set up github pages
// should add force push check box for gh-pages branch
// add public or private repo option

export function GitHubDestinationForm({
  form,
  remoteAuth,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"github">>;
  remoteAuth: RemoteAuthDAO | null;
  defaultName?: string;
}) {
  const agent = useRemoteAuthAgent<RemoteAuthGithubAgent>(remoteAuth);

  // Check if user has private repo permissions based on scope
  // For GitHub OAuth: "repo" = full access, "public_repo" = public only
  const hasScope = !!(remoteAuth?.data && "scope" in remoteAuth.data && remoteAuth.data.scope);
  const scopeValue = hasScope ? (remoteAuth.data as any).scope : null;
  const canCreatePrivate = hasScope && scopeValue && scopeValue.includes("repo") && !scopeValue.includes("public_repo");

  // Default visibility: private if they can create private, otherwise public
  const [visibility, setVisibility] = useState<RepositoryVisibility>(canCreatePrivate ? "private" : "public");

  const {
    isLoading,
    searchValue,
    reset: searchReset,
    updateSearch,
    clearCache,
    searchResults,
    error,
  } = useRemoteGitRepoSearch({
    agent,
    cacheKey: String(remoteAuth?.guid),
  });

  const updateBaseUrlFromRepoFullName = (fullName: string) => {
    const repoName = coerceRepoToName(fullName);
    form.setValue("meta.baseUrl", absPath([...repoName.split("/")].pop() || "/"));
  };
  const { ident, msg, request } = useRemoteGitRepo({
    agent,
    defaultName,
    onCreate: ({ full_name }) => {
      updateBaseUrlFromRepoFullName(full_name);
      clearCache();
    },
    visibility,
  });

  // Choose appropriate capability factory based on auth type
  const capabilities = hasScope ? createGitHubCapabilities(canCreatePrivate) : createGitHubAPICapabilities(); // API keys don't have scope info

  return (
    <RepositoryCreationProvider capabilities={capabilities}>
      <RemoteResourceRoot
        control={form.control}
        fieldName="meta.repository"
        onValueChange={(value: string) => form.setValue("meta.repository", value)}
        onBlur={() =>
          flushSync(() => {
            const repoName = coerceRepoToName(form.getValues("meta.repository"));
            form.setValue("meta.repository", repoName);
            updateBaseUrlFromRepoFullName(repoName);
          })
        }
        getValue={() => form.getValues("meta.repository")}
      >
        <RemoteResourceSearch
          label="Repository"
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          searchResults={searchResults}
          error={error}
        />
        <RemoteResourceCreate
          label="Repository"
          placeholder="my-website-repo"
          ident={ident}
          msg={msg}
          request={request}
          icon={getVisibilityIcon(visibility)}
        >
          <RepositoryVisibilitySelector value={visibility} onChange={setVisibility} />
        </RemoteResourceCreate>
        <RemoteResourceInput
          label="Repository"
          placeholder="my-website-repo"
          createButtonTitle="Create Repository"
          searchButtonTitle="Search Repositories"
          ident={ident}
          onSearchChange={updateSearch}
          searchReset={searchReset}
          createReset={request.reset}
        />
      </RemoteResourceRoot>
      <FormField
        control={form.control}
        name="meta.branch"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Branch</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="gh-pages"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="meta.baseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base URL</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="/"
                onBlur={() => flushSync(() => form.setValue("meta.baseUrl", absPath(form.getValues("meta.baseUrl"))))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </RepositoryCreationProvider>
  );
}

const githubValidator = createValidationHelper<RemoteAuthGithubAgent>("github");

export const GithubEval = async (formData: DestinationMetaType<"github">, remoteAuth: RemoteAuthDAO | null) => {
  // Validate required fields and auth
  const repository = githubValidator.validateRequired(formData.meta.repository, "Repository");
  const agent = githubValidator.validateAuthAndCreateAgent(remoteAuth);

  if (!agent.githubClient) {
    throw githubValidator.createValidationError("Failed to initialize GitHub client");
  }

  return githubValidator.withErrorHandling(
    async () => {
      // Normalize the repository name (handles URLs, partial names, etc.)
      const normalizedRepo = coerceRepoToName(repository);

      // Get the full repository name (owner/repo) and validate it exists
      const [owner, repo] = await agent.githubClient.getFullRepoName(normalizedRepo);
      const fullName = `${owner}/${repo}`;

      // // Conditionally update baseUrl if it wasn't set or is default
      // const baseUrl = conditionalUpdate(
      //   formData.meta.baseUrl,
      //   absPath(repo),
      //   (current) => !current || current === "/" || current === absPath("/")
      // );

      // Update form data using dot notation
      return updateFormData(formData, {
        "meta.repository": normalizedRepo, // Keep original input for display
        "meta.fullName": fullName, // Store resolved full name
        // "meta.baseUrl": baseUrl,
      });
    },
    "validate GitHub repository",
    (error) => handleNotFoundError(error, "Repository", repository)
  );
};
