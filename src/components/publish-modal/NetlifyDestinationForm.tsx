import {
  useRemoteNetlifySearch,
  useRemoteNetlifySite,
} from "@/components/RemoteConnectionItem";
import { DestinationMetaType, NetlifyDestination } from "@/data/DestinationDAO";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { UseFormReturn } from "react-hook-form";
import { RemoteResource } from "./RemoteResourceField";

export function NetlifyDestinationForm({
  form,
  remoteAuth,
  destination,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"netlify">>;
  remoteAuth: RemoteAuthDAO | null;
  destination: NetlifyDestination | null;
  defaultName?: string;
}) {
  const agent = useRemoteAuthAgent<RemoteAuthNetlifyAgent>(remoteAuth);
  const { isLoading, searchValue, updateSearch, searchResults, error } = useRemoteNetlifySearch({
    agent,
  });
  const { ident, msg, request } = useRemoteNetlifySite({
    createRequest: agent.createSite,
    defaultName,
  });

  return (
    <RemoteResource.Root
      control={form.control}
      fieldName="meta.siteName"
      onValueChange={(value: string) => form.setValue("meta.siteName", value)}
      getValue={() => form.getValues("meta.siteName")}
    >
      <RemoteResource.Search
        label="Site Name"
        isLoading={isLoading}
        searchValue={searchValue}
        onSearchChange={updateSearch}
        searchResults={searchResults}
        error={error}
      />
      <RemoteResource.Create
        label="Site Name"
        placeholder="my-netlify-site"
        ident={ident}
        msg={msg}
        request={request}
        onCreateSuccess={(name: string) => {
          void destination?.update({ meta: { siteName: name } });
        }}
      />
      <RemoteResource.Input
        label="Site Name"
        placeholder="my-netlify-site"
        createButtonTitle="Add Site"
        searchButtonTitle="Find Site"
        ident={ident}
        onSearchChange={updateSearch}
      />
    </RemoteResource.Root>
  );
}
