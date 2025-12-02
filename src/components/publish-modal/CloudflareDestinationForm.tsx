import {
  RemoteResourceCreate,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "@/components/publish-modal/RemoteResourceField";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRemoteAuthAgent } from "@/data/AgentFromRemoteAuthFactory";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { RemoteAuthCloudflareAPIAgent } from "@/data/RemoteAuthCloudflareAPIAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { UseFormReturn } from "react-hook-form";
import { useRemoteCloudflareProject, useRemoteSearch } from "../RemoteConnectionItem";
/*
Step 2 — Add Permissions
You need two main resource types and their permissions:
Resource Type	Permission	Why
Account → Cloudflare Pages	Edit	Create deployments and manage projects
Account → Cloudflare Pages	Read	List projects or deployments
Account → Account Settings	Read	List account info if you use the API to discover your account_id programmatically
*/

function CloudflareAccountIdSearchDropdown({
  agent,
  form,
}: {
  agent: RemoteAuthCloudflareAPIAgent;
  form: UseFormReturn<DestinationMetaType<"cloudflare">>;
}) {
  const { isLoading, searchValue, updateSearch, searchResults, error, setEnabled } = useRemoteSearch({
    agent: agent.toAccountSearchAgent(),
    config: { searchKey: "accountId" },
  });

  return (
    <RemoteResourceRoot
      control={form.control}
      fieldName="meta.accountId"
      onValueChange={(value: string) => form.setValue("meta.accountId", value)}
      getValue={() => form.getValues("meta.accountId")}
    >
      <RemoteResourceSearch
        label="Account Id"
        isLoading={isLoading}
        searchValue={searchValue}
        onActive={() => setEnabled(true)}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
    </RemoteResourceRoot>
  );
}

function CloudflareProjectNameSearchDropdown({
  agent,
  form,
}: {
  agent: RemoteAuthCloudflareAPIAgent;
  form: UseFormReturn<DestinationMetaType<"cloudflare">>;
}) {
  const { ident, msg, request } = useRemoteCloudflareProject({
    createRequest: async (name: string, options: { signal?: AbortSignal }) => {
      const response = await agent.createProject({ name }, options);
      clearCache();
      return response;
    },
    defaultName,
  });
  const { isLoading, searchValue, updateSearch, searchResults, error, setEnabled } = useRemoteSearch({
    agent: agent.toProjectSearchAgent(),
    config: { searchKey: "name" },
  });

  return (
    <RemoteResourceRoot
      control={form.control}
      fieldName="meta.projectName"
      onValueChange={(value: string) => form.setValue("meta.projectName", value)}
      getValue={() => form.getValues("meta.projectName")}
    >
      <RemoteResourceSearch
        label="Account Id"
        isLoading={isLoading}
        searchValue={searchValue}
        onActive={() => setEnabled(true)}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      <RemoteResourceCreate></RemoteResourceCreate>
    </RemoteResourceRoot>
  );
}

export function CloudflareDestinationForm({
  form,
  remoteAuth,
}: {
  form: UseFormReturn<DestinationMetaType<"cloudflare">>;
  remoteAuth: RemoteAuthDAO | null;
}) {
  const agent = useRemoteAuthAgent<RemoteAuthCloudflareAPIAgent>(remoteAuth);
  return (
    <>
      <FormField
        control={form.control}
        name="meta.accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="account-id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="meta.projectName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="my-cloudflare-site-id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <CloudflareAccountIdSearchDropdown agent={agent} form={form} />
    </>
  );
}
