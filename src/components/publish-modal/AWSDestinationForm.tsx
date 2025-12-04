import { AWS_REGIONS } from "@/api/aws/AWSRegions";
import { useRemoteAWSBucket, useRemoteAWSSearch } from "@/components/RemoteConnectionItem";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { RemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthAWSAPIAgent } from "@/data/remote-auth/RemoteAuthAWSAPIAgent";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import fuzzysort from "fuzzysort";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "./RemoteResourceField";

type RegionItem = { element: ReactNode; label: string; value: string };

function RegionSearchDropdown({
  searchValue,
  onSearchChange,
  onClose,
  onSelect,
  className,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: (inputVal?: string) => void;
  onSelect: (item: RegionItem) => void;
  className?: string;
}) {
  const allItems = useMemo(() => {
    if (!searchValue) {
      return AWS_REGIONS.map((region) => ({
        value: region.value,
        label: region.label,
        element: <span className="uppercase">{region.label}</span>,
      }));
    }

    return fuzzysort.go(searchValue, AWS_REGIONS, { key: "label" }).map((result) => ({
      value: result.obj.value,
      label: result.obj.label,
      element: (
        <span className="uppercase">
          {result.highlight((m, i) => (
            <b className="text-ring" key={i}>
              {m}
            </b>
          )) || result.obj.label}
        </span>
      ),
    }));
  }, [searchValue]);

  const { resetActiveIndex, containerRef, handleKeyDown, getInputProps, getMenuProps, getItemProps } =
    useKeyboardNavigation({
      onEnter: (activeIndex) => {
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          onSelect(allItems[activeIndex]!);
        }
      },
      onEscape: () => {
        onClose(searchValue.trim() || undefined);
      },
      searchValue,
      onSearchChange,
      wrapAround: true,
    });

  useEffect(() => {
    resetActiveIndex();
  }, [resetActiveIndex]);

  const handleItemClick = (item: RegionItem) => {
    onSelect(item);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node) && !e.relatedTarget?.closest("[data-capture-focus]")) {
      onClose(searchValue.trim() || undefined);
    }
  };

  const showDropdown = allItems.length > 0 || !!searchValue;

  return (
    <Popover.Root open={showDropdown}>
      <div
        ref={containerRef}
        className={cn("w-full p-0", className)}
        onKeyDown={(e) => {
          console.log(e);
          e.stopPropagation();
          handleKeyDown(e);
        }}
      >
        <Popover.Anchor asChild>
          <Input
            {...getInputProps()}
            data-no-escape
            autoFocus
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onClose(searchValue.trim());
              handleKeyDown(e);
            }}
            onBlur={handleInputBlur}
            placeholder="Search regions..."
            className="w-full"
          />
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={2}
            className="z-50 w-[var(--radix-popover-trigger-width)] max-h-96 overflow-auto rounded-lg bg-sidebar shadow-lg border scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
            data-capture-focus
          >
            {allItems.length > 0 && (
              <ul {...getMenuProps()} className="text-xs">
                {allItems.map((region, index) => (
                  <li key={region.value} role="presentation" className="flex w-full flex-col rounded p-1">
                    <button
                      {...getItemProps(index)}
                      onClick={() => handleItemClick(region)}
                      className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
                    >
                      <div className="min-w-0 truncate text-md font-mono">{region.element}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {allItems.length === 0 && searchValue && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No regions found</div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}

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
  const region = useWatch({
    control: form.control,
    name: "meta.region",
  });
  if (region) agent.setRegion(region);

  const {
    isLoading,
    searchValue,
    updateSearch,
    reset: resetSearch,
    searchResults,
    error,
    setEnabled,
  } = useRemoteAWSSearch({
    agent,
  });
  const { ident, msg, request } = useRemoteAWSBucket({
    createRequest: agent.createBucket,
    defaultName,
  });

  return (
    <>
      <RemoteResourceRoot
        control={form.control}
        fieldName="meta.bucketName"
        onValueChange={(value: string) => form.setValue("meta.bucketName", value)}
        getValue={() => form.getValues("meta.bucketName")}
      >
        <RemoteResourceSearch
          label="Bucket Name"
          isLoading={isLoading}
          searchValue={searchValue}
          onActive={() => setEnabled(true)}
          onSearchChange={updateSearch}
          searchResults={searchResults}
          error={error}
        />
        <RemoteResourceCreate
          label="Bucket Name"
          placeholder="my-website-bucket"
          ident={ident}
          msg={msg}
          request={request}
        />
        <RemoteResourceInput
          label="Bucket Name"
          placeholder="my-website-bucket"
          createButtonTitle="Create Bucket"
          searchButtonTitle="Search Buckets"
          ident={ident}
          onSearchChange={updateSearch}
          createReset={request.reset}
          searchReset={resetSearch}
        />
      </RemoteResourceRoot>
      <FormField
        control={form.control}
        name="meta.region"
        render={({ field }) => {
          const [searchValue, setSearchValue] = useState("");
          const [showSearch, setShowSearch] = useState(false);

          const selectedRegion = AWS_REGIONS.find((r) => r.value === field.value);
          const displayValue = selectedRegion
            ? selectedRegion.label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : "";

          return (
            <FormItem>
              <FormLabel>Region</FormLabel>
              <FormControl>
                {showSearch ? (
                  <RegionSearchDropdown
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    onClose={() => {
                      setShowSearch(false);
                      setSearchValue("");
                    }}
                    onSelect={(item) => {
                      field.onChange(item.value);
                      setShowSearch(false);
                      setSearchValue("");
                    }}
                  />
                ) : (
                  <Input
                    data-no-escape
                    value={displayValue}
                    placeholder="Select a region"
                    autoFocus
                    onClick={() => setShowSearch(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        return e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setSearchValue(e.target.value.toLowerCase());
                      setShowSearch(true);
                    }}
                    className="cursor-pointer lowercase"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </>
  );
}
