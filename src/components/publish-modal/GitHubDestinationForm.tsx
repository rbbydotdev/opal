import {
  useRemoteGitRepo,
  useRemoteGitRepoSearch,
} from "@/components/RemoteConnectionItem";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType, GitHubDestination } from "@/data/DestinationDAO";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { UseFormReturn } from "react-hook-form";
import { RemoteResource } from "./RemoteResourceField";

export function GitHubDestinationForm({
  form,
  remoteAuth,
  destination,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"github">>;
  remoteAuth: RemoteAuthDAO | null;
  destination: GitHubDestination | null;
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
          onCreateSuccess={(name: string) => {
            // Note: For GitHub, we store the repository name, not the URL
            // The name should match what the user sees in the interface
            void destination?.update({ 
              meta: { 
                repository: name,
                branch: form.getValues("meta.branch") || "main"
              } 
            });
          }}
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
                placeholder="main"
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