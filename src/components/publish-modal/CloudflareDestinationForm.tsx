import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
  RemoteResourceSearchInput,
} from "@/components/publish-modal/RemoteResourceField";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { RemoteAuthCloudflareAPIAgent } from "@/data/RemoteAuthCloudflareAPIAgent";
import { CloudflareAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useMemo } from "react";
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
  const { isLoading, searchValue, updateSearch, searchResults, error, setEnabled, reset: searchReset } = useRemoteSearch({
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
      <RemoteResourceSearchInput
        label="Account Id"
        placeholder="Enter account ID"
        searchButtonTitle="Search Accounts"
        onSearchChange={updateSearch}
        searchReset={searchReset}
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
  const { isLoading, searchValue, clearCache, updateSearch, searchResults, error, setEnabled, reset: searchReset } = useRemoteSearch({
    agent: agent.toProjectSearchAgent(),
    config: { searchKey: "name" },
  });
  const { ident, msg, request } = useRemoteCloudflareProject({
    createRequest: async (name: string, options: { signal?: AbortSignal }) => {
      const response = await agent.createProject({ name }, options);
      clearCache();
      return response;
    },
    defaultName: "",
  });

  return (
    <RemoteResourceRoot
      control={form.control}
      fieldName="meta.projectName"
      onValueChange={(value: string) => form.setValue("meta.projectName", value)}
      getValue={() => form.getValues("meta.projectName")}
    >
      <RemoteResourceSearch
        label="Project Name"
        isLoading={isLoading}
        searchValue={searchValue}
        onActive={() => setEnabled(true)}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      <RemoteResourceCreate label="Project Name" placeholder="my-project" ident={ident} msg={msg} request={request} />
      <RemoteResourceInput
        label="Project Name"
        placeholder="my-project"
        createButtonTitle="Create Project"
        searchButtonTitle="Search Projects"
        ident={ident}
        onSearchChange={updateSearch}
        searchReset={searchReset}
        createReset={request.reset}
      />
    </RemoteResourceRoot>
  );
}

export function CloudflareDestinationForm({
  form,
  remoteAuth,
}: {
  form: UseFormReturn<DestinationMetaType<"cloudflare">>;
  remoteAuth: CloudflareAPIRemoteAuthDAO | null;
}) {
  const agent = useMemo(() => (remoteAuth ? new RemoteAuthCloudflareAPIAgent(remoteAuth) : null), [remoteAuth]);
  if (!agent) return null;
  return (
    <>
      <CloudflareAccountIdSearchDropdown agent={agent} form={form} />
      <CloudflareProjectNameSearchDropdown agent={agent} form={form} />
    </>
  );
}
