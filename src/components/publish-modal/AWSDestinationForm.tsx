import {
  RemoteItemCreateInput,
  RemoteItemSearchDropDown,
  useRemoteAWSSearch,
  useRemoteAWSBucket,
} from "@/components/RemoteConnectionItem";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DestinationMetaType, AWSDestination } from "@/data/DestinationDAO";
import { RemoteAuthAWSAPIAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { AWS_REGIONS, getRegionDisplayName } from "@/lib/aws/AWSRegions";
import { Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

export function AWSDestinationForm({
  form,
  remoteAuth,
  destination,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"aws">>;
  remoteAuth: RemoteAuthDAO | null;
  destination: AWSDestination | null;
  defaultName?: string;
}) {
  const [bucketMode, setBucketMode] = useState<"search" | "input" | "create">("input");
  const inputRef = useRef<HTMLInputElement>(null);
  const agent = useRemoteAuthAgent<RemoteAuthAWSAPIAgent>(remoteAuth);
  const { isLoading, searchValue, updateSearch, searchResults, error, clearError } = useRemoteAWSSearch({
    agent,
  });
  const { ident, msg, request } = useRemoteAWSBucket({
    createRequest: agent?.createBucket || (async () => { throw new Error("No agent available"); }),
    defaultName,
  });

  useEffect(() => {
    if (bucketMode === "input" && inputRef.current) inputRef.current?.focus();
  }, [bucketMode]);

  const handleCreateSubmit = async () => {
    const res = await request.submit();
    if (!res) return null;
    void destination?.update({ meta: { bucketName: res.name, region: form.getValues("meta.region") } });
    form.setValue("meta.bucketName", res.name);
    setBucketMode("input");
  };
  // Bucket name field with search/create modes
  const bucketNameField = () => {
    if (bucketMode === "search") {
      return (
        <div>
          <FormLabel>Bucket Name</FormLabel>
          <RemoteItemSearchDropDown
            className="mt-2"
            isLoading={isLoading}
            searchValue={searchValue}
            onSearchChange={updateSearch}
            onClose={(val?: string) => {
              setBucketMode("input");
              if (val) {
                form.setValue("meta.bucketName", val);
              }
            }}
            onSelect={(item: { element: import("react").ReactNode; label: string; value: string }) => {
              form.setValue("meta.bucketName", item.value);
              setBucketMode("input");
            }}
            error={error}
            allItems={searchResults}
          />
        </div>
      );
    }
    
    if (bucketMode === "create") {
      return (
        <div>
          <FormLabel>Bucket Name</FormLabel>
          <RemoteItemCreateInput
            className="mt-2"
            placeholder="my-website-bucket"
            onClose={(inputVal?: string) => {
              setBucketMode("input");
              if (inputVal) {
                form.setValue("meta.bucketName", inputVal);
              }
            }}
            submit={handleCreateSubmit}
            request={request}
            msg={msg}
            ident={ident}
          />
        </div>
      );
    }
    
    // Default input mode
    return (
      <FormField
        control={form.control}
        name="meta.bucketName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bucket Name</FormLabel>
            <div className="flex justify-center w-full items-center gap-2">
              <FormControl>
                <Input
                  {...field}
                  ref={inputRef}
                  placeholder="my-website-bucket"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                title="Create Bucket"
                onClick={() => {
                  const currentValue = form.getValues("meta.bucketName");
                  ident.setName(currentValue || "");
                  setBucketMode("create");
                }}
              >
                <Plus />
              </Button>
              <Button
                type="button"
                variant="outline"
                title="Search Buckets"
                onClick={() => {
                  const currentValue = form.getValues("meta.bucketName");
                  updateSearch(currentValue || "");
                  setBucketMode("search");
                }}
              >
                <Search />
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <>
      {bucketNameField()}
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
