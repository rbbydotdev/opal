import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "@/components/publish-modal/RemoteResourceField";
import { useRemoteVercelProject, useRemoteVercelProjectSearch } from "@/components/RemoteConnectionItem";
import { useRemoteAuthAgent } from "@/data/AgentFromRemoteAuthFactory";
import { RemoteAuthDAO } from "@/data/DAO/RemoteAuthDAO";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { RemoteAuthVercelAgent } from "@/data/RemoteAuthVercelAgent";
import { UseFormReturn } from "react-hook-form";

export function VercelDestinationForm({
  form,
  remoteAuth,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"vercel">>;
  remoteAuth: RemoteAuthDAO | null;
  defaultName?: string;
}) {
  const agent = useRemoteAuthAgent<RemoteAuthVercelAgent>(remoteAuth);

  const {
    isLoading,
    searchValue,
    updateSearch,
    clearCache,
    reset: resetSearch,
    searchResults,
    error,
    setEnabled,
  } = useRemoteVercelProjectSearch({
    agent,
  });

  const { ident, msg, request } = useRemoteVercelProject({
    createRequest: async (name: string, options: { signal?: AbortSignal }) => {
      const response = await agent.createProject({ name }, options);
      clearCache();
      return response;
    },
    defaultName,
  });

  return (
    <>
      <RemoteResourceRoot
        control={form.control}
        fieldName="meta.project"
        onValueChange={(value: string) => form.setValue("meta.project", value)}
        getValue={() => form.getValues("meta.project")}
      >
        <RemoteResourceSearch
          label="Project"
          isLoading={isLoading}
          onActive={() => setEnabled(true)}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          searchResults={searchResults}
          error={error}
        />
        <RemoteResourceCreate label="Project" placeholder="my-project" ident={ident} msg={msg} request={request} />
        <RemoteResourceInput
          label="Project"
          placeholder="my-project"
          createButtonTitle="Create Project"
          searchButtonTitle="Search Projects"
          ident={ident}
          onSearchChange={updateSearch}
          createReset={request.reset}
          searchReset={resetSearch}
        />
      </RemoteResourceRoot>
    </>
  );
}
