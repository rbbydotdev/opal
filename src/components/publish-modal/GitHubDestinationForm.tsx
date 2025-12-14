import { useRemoteGitRepo, useRemoteGitRepoSearch } from "@/components/RemoteConnectionItem";
import { RepositoryVisibilitySelector, RepositoryVisibility, getVisibilityIcon } from "@/components/repository/RepositoryVisibilitySelector";
import { RepositoryCreationProvider, createGitHubCapabilities, createGitHubAPICapabilities } from "@/components/repository/RepositoryCreationProvider";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { coerceRepoToName, RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { flushSync } from "react-dom";
import { UseFormReturn } from "react-hook-form";
import { useState, useRef } from "react";
import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "./RemoteResourceField";

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
  const hasScope = !!(remoteAuth?.data && 'scope' in remoteAuth.data && remoteAuth.data.scope);
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
  const { ident, msg, request } = useRemoteGitRepo({
    createRequest: async (name: string, options: { signal?: AbortSignal }) => {
      const response = await agent.createRepo({ 
        repoName: name, 
        private: visibility === "private" 
      }, options);
      clearCache();
      return response.data;
    },
    defaultName,
  });

  // Choose appropriate capability factory based on auth type
  const capabilities = hasScope 
    ? createGitHubCapabilities(canCreatePrivate)
    : createGitHubAPICapabilities(); // API keys don't have scope info

  return (
    <RepositoryCreationProvider capabilities={capabilities}>
      <RemoteResourceRoot
        control={form.control}
        fieldName="meta.repository"
        onValueChange={(value: string) => form.setValue("meta.repository", value)}
        onBlur={() =>
          flushSync(() => form.setValue("meta.repository", coerceRepoToName(form.getValues("meta.repository"))))
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
          <RepositoryVisibilitySelector
            value={visibility}
            onChange={setVisibility}
          />
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
    </RepositoryCreationProvider>
  );
}
