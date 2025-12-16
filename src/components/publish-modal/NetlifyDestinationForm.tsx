import { useRemoteNetlifySearch, useRemoteNetlifySite } from "@/components/RemoteConnectionItem";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthNetlifyAgent } from "@/data/remote-auth/RemoteAuthNetlifyAgent";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { UseFormReturn } from "react-hook-form";
import { createValidationHelper, handleNotFoundError, updateFormData } from "./ValidationHelpers";
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
const netlifyValidator = createValidationHelper<RemoteAuthNetlifyAgent>("netlify");

export const NetlifyEval = async (formData: DestinationMetaType<"netlify">, remoteAuth: RemoteAuthDAO | null) => {
  // If we already have a siteId, no validation needed
  if (formData.meta.siteId && formData.meta.siteId.trim()) {
    return formData;
  }

  // Validate required fields and auth
  const siteName = netlifyValidator.validateRequired(formData.meta.siteName, "Site name");
  const agent = netlifyValidator.validateAuthAndCreateAgent(remoteAuth);

  if (!agent.netlifyClient) {
    throw netlifyValidator.createValidationError("Failed to initialize Netlify client");
  }

  return netlifyValidator.withErrorHandling(
    async () => {
      // Look up site by name
      const siteId = await agent.netlifyClient.getSiteIdByName(siteName);

      if (!siteId) {
        throw netlifyValidator.createValidationError(`Site "${siteName}" not found in your Netlify account`);
      }

      // Update form data using dot notation
      return updateFormData(formData, {
        "meta.siteId": siteId,
      });
    },
    "validate Netlify site"
  );
};
