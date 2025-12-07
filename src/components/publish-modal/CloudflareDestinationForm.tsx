import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
  RemoteResourceSearchInput,
} from "@/components/publish-modal/RemoteResourceField";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { RemoteAuthCloudflareAPIAgent } from "@/data/remote-auth/RemoteAuthCloudflareAPIAgent";
import { CloudflareAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
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
  cacheKey,
}: {
  agent: RemoteAuthCloudflareAPIAgent;
  form: UseFormReturn<DestinationMetaType<"cloudflare">>;
  cacheKey: string;
}) {
  const {
    isLoading,
    searchValue,
    updateSearch,
    searchResults,
    error,
    reset: searchReset,
  } = useRemoteSearch({
    agent: agent.AccountSearchAgent,
    cacheKey,
    config: {
      searchKey: "name",
      mapResult: (account, element) => ({
        label: account.name,
        value: account.id,
        element,
      }),
    },
  });

  return (
    <RemoteResourceRoot
      control={form.control}
      fieldName="meta.accountId"
      onValueChange={(value: string) => form.setValue("meta.accountId", value)}
      getValue={() => form.getValues("meta.accountId")}
    >
      <RemoteResourceSearch
        label="Account Id (search by name)"
        isLoading={isLoading}
        searchValue={searchValue}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      <RemoteResourceSearchInput
        label="Account Id"
        placeholder="my-account"
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
  cacheKey,
}: {
  agent: RemoteAuthCloudflareAPIAgent;
  form: UseFormReturn<DestinationMetaType<"cloudflare">>;
  cacheKey: string;
}) {
  const {
    isLoading,
    searchValue,
    clearCache,
    updateSearch,
    searchResults,
    error,
    reset: searchReset,
  } = useRemoteSearch({
    agent: agent.ProjectSearchAgent,
    config: { searchKey: "name" },
    cacheKey,
  });
  const accountId = useWatch({
    control: form.control,
    name: "meta.accountId",
  });
  agent.setAccountId(accountId);
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
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      {accountId && (
        <>
          <RemoteResourceCreate
            label="Project Name"
            placeholder="my-project"
            ident={ident}
            msg={msg}
            request={request}
          />
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
        </>
      )}
      {!accountId && <div className="text-sm text-ring bold mono mt-1">Select an account to continue</div>}
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
      <CloudflareAccountIdSearchDropdown cacheKey={String(remoteAuth?.guid)} agent={agent} form={form} />
      <CloudflareProjectNameSearchDropdown cacheKey={String(remoteAuth?.guid)} agent={agent} form={form} />
    </>
  );
}
