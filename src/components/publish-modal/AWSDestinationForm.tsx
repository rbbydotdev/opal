import { useRemoteAWSBucket, useRemoteAWSSearch } from "@/components/RemoteConnectionItem";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { RemoteAuthAWSAPIAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { AWS_REGIONS, getRegionDisplayName } from "@/lib/aws/AWSRegions";
import { UseFormReturn } from "react-hook-form";
import { RemoteResource } from "./RemoteResourceField";

export function AWSDestinationForm({
  form,
  remoteAuth,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"aws">>;
  remoteAuth: RemoteAuthDAO | null;
  defaultName?: string;
}) {
  const agent = useRemoteAuthAgent<RemoteAuthAWSAPIAgent>(remoteAuth);
  const { isLoading, searchValue, updateSearch, searchResults, error } = useRemoteAWSSearch({
    agent,
  });
  const { ident, msg, request } = useRemoteAWSBucket({
    createRequest: agent.createBucket,
    defaultName,
  });

  return (
    <>
      <RemoteResource.Root
        control={form.control}
        fieldName="meta.bucketName"
        onValueChange={(value: string) => form.setValue("meta.bucketName", value)}
        getValue={() => form.getValues("meta.bucketName")}
      >
        <RemoteResource.Search
          label="Bucket Name"
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          searchResults={searchResults}
          error={error}
        />
        <RemoteResource.Create
          label="Bucket Name"
          placeholder="my-website-bucket"
          ident={ident}
          msg={msg}
          request={request}
        />
        <RemoteResource.Input
          label="Bucket Name"
          placeholder="my-website-bucket"
          createButtonTitle="Create Bucket"
          searchButtonTitle="Search Buckets"
          ident={ident}
          onSearchChange={updateSearch}
        />
      </RemoteResource.Root>
      <FormField
        control={form.control}
        name="meta.region"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Region</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {AWS_REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {getRegionDisplayName(region.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
