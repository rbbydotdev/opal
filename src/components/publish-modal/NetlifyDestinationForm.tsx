import { useRemoteNetlifySearch, useRemoteNetlifySite } from "@/components/RemoteConnectionItem";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthNetlifyAgent } from "@/data/remote-auth/RemoteAuthNetlifyAgent";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { UseFormReturn } from "react-hook-form";
import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "./RemoteResourceField";

export function NetlifyDestinationForm({
  form,
  remoteAuth,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"netlify">>;
  remoteAuth: RemoteAuthDAO | null;
  defaultName?: string;
}) {
  const agent = useRemoteAuthAgent<RemoteAuthNetlifyAgent>(remoteAuth);
  const {
    isLoading,
    searchValue,
    updateSearch,
    reset: searchReset,
    searchResults,
    error,
  } = useRemoteNetlifySearch({
    agent,
    cacheKey: String(remoteAuth?.guid),
  });
  const { ident, msg, request } = useRemoteNetlifySite({
    createRequest: agent.createSite,
    defaultName,
  });

  return (
    <RemoteResourceRoot
      control={form.control}
      fieldName="meta.siteName"
      onValueChange={(value: string) => form.setValue("meta.siteName", value)}
      getValue={() => form.getValues("meta.siteName")}
    >
      <RemoteResourceSearch
        label="Site Name"
        isLoading={isLoading}
        searchValue={searchValue}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      <RemoteResourceCreate label="Site Name" placeholder="my-netlify-site" ident={ident} msg={msg} request={request} />
      <RemoteResourceInput
        label="Site Name"
        placeholder="my-netlify-site"
        createButtonTitle="Add Site"
        searchButtonTitle="Find Site"
        ident={ident}
        onSearchChange={updateSearch}
        searchReset={searchReset}
        createReset={request.reset}
      />
    </RemoteResourceRoot>
  );
}
