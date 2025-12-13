import { useRemoteGitRepo, useRemoteGitRepoSearch } from "@/components/RemoteConnectionItem";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { coerceRepoToName, RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { flushSync } from "react-dom";
import { UseFormReturn } from "react-hook-form";
import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "./RemoteResourceField";

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
      const response = await agent.createRepo(name, options);
      clearCache();
      return response.data;
    },
    defaultName,
  });

  return (
    <>
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
        />
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
    </>
  );
}
