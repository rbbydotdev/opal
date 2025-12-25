import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
  RemoteResourceSearchInput,
} from "@/components/publish-modal/RemoteResourceField";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { RemoteAuthCloudflareAPIAgent } from "@/data/remote-auth/RemoteAuthCloudflareAPIAgent";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
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

function CloudflareAccountNameSearchDropdown({
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
        value: account.name,
        element,
      }),
    },
  });

  return (
    <RemoteResourceRoot
      control={form.control}
      fieldName="meta.accountName"
      onValueChange={(value: string) => form.setValue("meta.accountName", value)}
      getValue={() => form.getValues("meta.accountName")}
    >
      <RemoteResourceSearch
        label="Account Name"
        isLoading={isLoading}
        searchValue={searchValue}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      <RemoteResourceSearchInput
        label="Account Name"
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
  const { accountId, accountName } =
    useWatch({
      control: form.control,
    }).meta ?? {};

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
    disabled: !accountId,
  });

  if (accountId) agent.setAccountId(accountId);
  //we have to get the account id from the name
  useAsyncEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (signal) => {
      if (!accountName || accountId) return;
      const id = await agent.fetchAccountIdByName(accountName, { signal });
      if (id) form.setValue("meta.accountId", id);
    },
    [accountId, accountName, agent, form]
  );

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
      {accountName && (
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
      {!accountName && <div className="text-sm text-ring bold mono mt-1">Enter an account name to continue</div>}
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
      <CloudflareAccountNameSearchDropdown cacheKey={String(remoteAuth?.guid) + "/account"} agent={agent} form={form} />
      <CloudflareProjectNameSearchDropdown cacheKey={String(remoteAuth?.guid) + "/project"} agent={agent} form={form} />
    </>
  );
}
