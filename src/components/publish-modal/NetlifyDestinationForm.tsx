import { useRemoteNetlifySearch, useRemoteNetlifySite } from "@/components/RemoteConnectionItem";
import { useRemoteAuthAgent } from "@/data/AgentFromRemoteAuthFactory";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
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
    setEnabled,
  } = useRemoteNetlifySearch({
    agent,
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
        onActive={() => setEnabled(true)}
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
