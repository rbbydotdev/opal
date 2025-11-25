import { useRemoteGitRepo, useRemoteGitRepoSearch } from "@/components/RemoteConnectionItem";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { UseFormReturn } from "react-hook-form";
import { RemoteResource } from "./RemoteResourceField";

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
  const { isLoading, searchValue, updateSearch, searchResults, error } = useRemoteGitRepoSearch({
    agent,
  });
  const { ident, msg, request } = useRemoteGitRepo({
    createRequest: async (name: string, options: { signal?: AbortSignal }) => {
      const response = await agent.createRepo(name, options);
      // Transform GitHub API response to match expected format
      return { name: response.data.name };
    },
    defaultName,
  });

  return (
    <>
      <RemoteResource.Root
        control={form.control}
        fieldName="meta.repository"
        onValueChange={(value: string) => form.setValue("meta.repository", value)}
        getValue={() => form.getValues("meta.repository")}
      >
        <RemoteResource.Search
          label="Repository"
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          searchResults={searchResults}
          error={error}
        />
        <RemoteResource.Create
          label="Repository"
          placeholder="my-website-repo"
          ident={ident}
          msg={msg}
          request={request}
        />
        <RemoteResource.Input
          label="Repository"
          placeholder="my-website-repo"
          createButtonTitle="Create Repository"
          searchButtonTitle="Search Repositories"
          ident={ident}
          onSearchChange={updateSearch}
        />
      </RemoteResource.Root>
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
