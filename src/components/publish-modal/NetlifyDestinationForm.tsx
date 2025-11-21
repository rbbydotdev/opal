import {
  RemoteItemCreateInput,
  RemoteItemSearchDropDown,
  useRemoteNetlifySearch,
  useRemoteNetlifySite,
} from "@/components/RemoteConnectionItem";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType, NetlifyDestination } from "@/data/DestinationDAO";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthAgent";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

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
  const [mode, setMode] = useState<"search" | "input" | "create">("input");
  const inputRef = useRef<HTMLInputElement>(null);
  const agent = useRemoteAuthAgent<RemoteAuthNetlifyAgent>(remoteAuth);
  const { isLoading, searchValue, updateSearch, searchResults, error, clearError } = useRemoteNetlifySearch({
    agent,
  });
  const { ident, msg, request } = useRemoteNetlifySite({
    createRequest: agent.createSite,
    defaultName,
  });

  useEffect(() => {
    if (mode === "input" && inputRef.current) inputRef.current?.focus();
  }, [mode]);

  const handleCreateSubmit = async () => {
    const res = await request.submit();
    if (!res) return null;
    void destination?.update({ meta: { siteName: res.name } });
    form.setValue("meta.siteName", res.name);
    setMode("input");
  };
  if (mode === "search") {
    return (
      <div>
        <FormLabel>Site Name</FormLabel>
        <RemoteItemSearchDropDown
          className="mt-2"
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          onClose={(val?: string) => {
            setMode("input");
            if (val) {
              form.setValue("meta.siteName", val);
            }
          }}
          onSelect={(item: { element: import("react").ReactNode; label: string; value: string }) => {
            form.setValue("meta.siteName", item.value);
            setMode("input");
          }}
          error={error}
          allItems={searchResults}
        />
      </div>
    );
  }
  if (mode === "create") {
    return (
      <div>
        <FormLabel>Site Name</FormLabel>
        <RemoteItemCreateInput
          className="mt-2"
          placeholder="my-netlify-site"
          onClose={(inputVal?: string) => {
            setMode("input");
            if (inputVal) {
              form.setValue("meta.siteName", inputVal);
            }
          }}
          submit={handleCreateSubmit}
          // }
          request={request}
          msg={msg}
          ident={ident}
        />
      </div>
    );
  }
  if (mode === "input") {
    return (
      <FormField
        control={form.control}
        name="meta.siteName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site Name</FormLabel>
            <div className="flex justify-center w-full items-center gap-2">
              <FormControl>
                <Input
                  {...field}
                  ref={inputRef}
                  placeholder="my-netlify-site"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
              </FormControl>
              <Button
                variant="outline"
                title="Add Site"
                onClick={() => {
                  const currentValue = form.getValues("meta.siteName");
                  ident.setName(currentValue || "");
                  setMode("create");
                }}
              >
                <Plus />
              </Button>
              <Button
                variant="outline"
                title="Find Site"
                onClick={() => {
                  const currentValue = form.getValues("meta.siteName");
                  updateSearch(currentValue || "");
                  setMode("search");
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
  }
}
