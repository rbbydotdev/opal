import { Input } from "@/components/ui/input";
import { useDebounce } from "@/context/useDebounce";
import { Repo } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType, isFuzzyResult } from "@/data/RemoteSearchFuzzyCache";
import { useAnySearch } from "@/data/useAnySearch";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { AWSS3Bucket } from "@/lib/aws/AWSClient";
import { NetlifySite } from "@/lib/netlify/NetlifyClient";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { Ban, Loader } from "lucide-react";
import React, { ReactNode, useEffect, useMemo, useState } from "react";

// const { msg, request, isValid, name, setName } = useAccountItem({ remoteAuth, defaultName: workspaceName });
type RemoteRequestType<T = any> = {
  error: string | null;
  isLoading: boolean;
  submit: () => Promise<T | null>;
  reset: () => void;
};
type RemoteRequestMsgType = {
  creating: string;
  askToEnter: string;
  valid: string;
  error: string | null;
};
type RemoteRequestIdentType = {
  isValid: boolean;
  name: string;
  setName: (name: string) => void;
};
namespace RemoteItemType {
  export type Request<T = any> = RemoteRequestType<T>;
  export type Msg = RemoteRequestMsgType;
  export type Ident = RemoteRequestIdentType;
}

export function RemoteItemCreateInput<T = any>({
  onClose,
  request,
  msg,
  className,
  ident,
  submit,
  placeholder = "my-new-thing",
}: {
  onClose: (val?: string) => void;
  submit: () => void;
  request: RemoteItemType.Request<T>;
  msg: RemoteItemType.Msg;
  ident: RemoteItemType.Ident;
  className?: string;
  placeholder?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && ident.isValid) {
      e.preventDefault();
      return submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className={cn("w-full relative", className)}>
      <div className="w-full p-0 relative">
        <Input
          data-no-escape
          autoFocus
          value={ident.name}
          onChange={(e) => ident.setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onClose(ident.name.trim() || undefined)}
          placeholder={placeholder}
          className="w-full"
          disabled={request.isLoading}
        />

        {request.error && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border border-destructive rounded-b-lg shadow-lg">
            <div className="flex items-center px-3 py-2 text-sm text-destructive">
              <Ban className="h-4 w-4 mr-2" />
              {request.error}
            </div>
          </div>
        )}

        {request.isLoading && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              {msg.creating}
            </div>
          </div>
        )}

        {ident.isValid && (
          <button
            className="hover:text-ring group text-left flex justify-center items-center absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              // void request.create(onCreated);
              submit();
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="px-3 py-2 text-sm group-hover:text-ring text-muted-foreground">{msg.valid}</span>
          </button>
        )}
      </div>
    </div>
  );
}

type RemoteItem = { element: ReactNode; label: string; value: string };
export function RemoteItemSearchDropDown({
  isLoading,
  searchValue,
  className,
  onSearchChange,
  onClose,
  onSelect,
  allItems,
  error,
}: {
  isLoading: boolean;
  searchValue: string;
  className?: string;
  onSearchChange: (value: string) => void;
  onClose: (inputVal?: string) => void;
  onSelect: (item: RemoteItem) => void;
  error?: string | null;
  allItems: RemoteItem[];
}) {
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

  const handleItemClick = (item: RemoteItem) => {
    onSelect(item);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node) && !e.relatedTarget?.closest("[data-capture-focus]")) {
      onClose(searchValue.trim() || undefined);
    }
  };

  const hasError = !!error;
  const showDropdown = !!hasError || !!isLoading || allItems.length > 0 || (allItems.length === 0 && !!searchValue);

  return (
    <Popover.Root open={showDropdown}>
      <div ref={containerRef} className={cn("w-full p-0", className)} onKeyDown={handleKeyDown}>
        <Popover.Anchor asChild>
          <Input
            {...getInputProps()}
            data-no-escape
            autoFocus
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onClose(searchValue.trim());
            }}
            onBlur={handleInputBlur}
            placeholder="Search..."
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
              /* fixes scroll: https://github.com/radix-ui/primitives/issues/1159 */
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
            data-capture-focus
          >
            {hasError && (
              <div className="flex w-full flex-col rounded p-1">
                <div className="group flex h-8 min-w-0 items-center rounded-md justify-start border-destructive border px-2 py-5">
                  <Ban className="text-destructive h-4 w-4 mr-2" />
                  <span className="text-md font-mono truncate min-w-0">Error {error}</span>
                </div>
              </div>
            )}

            {!hasError && isLoading && (
              <div className="flex w-full flex-col rounded p-1">
                <div className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 px-2 py-5">
                  <Loader className="animate-spin h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-md font-mono shimmer-text">Loading...</span>
                </div>
              </div>
            )}

            {!hasError && !isLoading && allItems.length > 0 && (
              <ul {...getMenuProps()} className="text-xs">
                {allItems.map((repo, index) => (
                  <li key={repo.value} role="presentation" className="flex w-full flex-col rounded p-1">
                    <button
                      {...getItemProps(index)}
                      onClick={() => handleItemClick(repo)}
                      className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
                    >
                      <div className="min-w-0 truncate text-md font-mono">{repo.element}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {allItems.length === 0 && searchValue && !hasError && !isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">None found</div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}
function extractResult<T = unknown>(result: T | Fuzzysort.KeyResult<T>): T {
  return isFuzzyResult<T>(result) ? result.obj : result;
}

// Generic search hook configuration
interface RemoteSearchConfig<T extends Record<string, any>> {
  searchKey: Extract<keyof T, string>;
  mapResult?: (item: T, highlightedElement?: ReactNode) => { label: string; value: string; element: ReactNode };
}

// Core generic search hook
function useRemoteSearch<T extends Record<string, any>>({
  agent,
  config,
  defaultValue = "",
}: {
  agent: RemoteAuthAgentSearchType<T> | null;
  config: RemoteSearchConfig<T>;
  defaultValue?: string;
}) {
  const [searchValue, updateSearch] = useState(defaultValue);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { loading, results, error, clearError } = useAnySearch<T>({
    agent,
    searchTerm: debouncedSearchValue,
    searchKey: config.searchKey,
  });

  const searchResults = useMemo(() => {
    return results.map((result) => {
      const item = extractResult<T>(result);
      const keyValue = String(item[config.searchKey]);

      // Generate highlighted element
      const highlightedElement = isFuzzyResult<T>(result)
        ? result.highlight((m, i) => (
            <b className={"text-ring"} key={i}>
              {m}
            </b>
          ))
        : keyValue;

      if (config.mapResult) {
        return config.mapResult(item, highlightedElement);
      }

      // Default mapping logic
      return {
        label: keyValue,
        value: keyValue,
        element: highlightedElement,
      };
    });
  }, [results, config]);

  return {
    isLoading: loading || (debouncedSearchValue !== searchValue && Boolean(searchValue)),
    searchValue,
    updateSearch,
    clearError,
    searchResults,
    error,
  };
}

export function useRemoteNetlifySearch({
  agent,
  defaultValue = "",
}: {
  agent: RemoteAuthAgentSearchType<NetlifySite> | null;
  defaultValue?: string;
}) {
  return useRemoteSearch<NetlifySite>({
    agent,
    config: {
      searchKey: "name",
    },
    defaultValue,
  });
}

export function useRemoteNetlifySite<T = any>({
  createRequest,
  defaultName,
}: {
  createRequest: (name: string, { signal }: { signal?: AbortSignal }) => Promise<T>;
  defaultName?: string;
}): {
  request: RemoteItemType.Request<T>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  return useRemoteResource<T>({
    createRequest,
    defaultName,
    config: {
      messages: {
        creating: "Creating Netlify site...",
        askToEnter: "Enter a name to create a new Netlify site",
        validPrefix: "Press Enter to create Netlify site",
        errorFallback: "Failed to create",
      },
    },
  });
}

export function useRemoteGitRepoSearch({
  agent,
  defaultValue = "",
}: {
  agent: RemoteAuthAgentSearchType<Repo> | null;
  defaultValue?: string;
}) {
  return useRemoteSearch<Repo>({
    agent,
    config: {
      searchKey: "full_name",
      mapResult: (repo, highlightedElement) => ({
        label: repo.full_name,
        value: repo.html_url,
        element: highlightedElement || repo.full_name,
      }),
    },
    defaultValue,
  });
}

export function useRemoteGitRepo<T = any>({
  createRequest,
  defaultName,
  repoPrefix = "",
}: {
  createRequest: (name: string, { signal }: { signal?: AbortSignal }) => Promise<T>;
  defaultName?: string;
  repoPrefix?: string;
}): {
  request: RemoteItemType.Request<T>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  const result = useRemoteResource<T>({
    createRequest,
    defaultName,
    config: {
      messages: {
        creating: "Creating repository...",
        askToEnter: "Enter a name to create a new repository",
        validPrefix: "Press Enter to create repository",
        errorFallback: "Failed to create repository",
      },
    },
  });

  // Override msg to include repoPrefix
  return {
    ...result,
    msg: {
      ...result.msg,
      valid: `Press Enter to create repository "${repoPrefix}${result.ident.name.trim()}"`,
    },
  };
}

export function useRemoteAWSSearch({
  agent,
  defaultValue = "",
}: {
  agent: RemoteAuthAgentSearchType<AWSS3Bucket> | null;
  defaultValue?: string;
}) {
  return useRemoteSearch<AWSS3Bucket>({
    agent,
    config: {
      searchKey: "name",
    },
    defaultValue,
  });
}

// Generic resource creation hook configuration
interface RemoteResourceConfig {
  messages: {
    creating: string;
    askToEnter: string;
    validPrefix: string; // e.g., "Press Enter to create Netlify site"
    errorFallback: string;
  };
  transformName?: (name: string) => string;
}

// Core generic resource creation hook
function useRemoteResource<T>({
  createRequest,
  config,
  defaultName,
}: {
  createRequest: (name: string, { signal }: { signal?: AbortSignal }) => Promise<T>;
  config: RemoteResourceConfig;
  defaultName?: string;
}): {
  request: RemoteItemType.Request<T>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  const [name, setName] = useState(defaultName || "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortCntrlRef = React.useRef<AbortController | null>(null);

  // Clear error when name changes
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [name, error]);

  const create = async () => {
    const transformedName = config.transformName ? config.transformName(name.trim()) : name.trim();
    if (!transformedName) return null;

    setIsLoading(true);
    setError(null);
    try {
      abortCntrlRef.current = new AbortController();
      const result = await createRequest(transformedName, { signal: abortCntrlRef.current.signal });
      setError(null);
      return result;
    } catch (err: any) {
      setError(err.message || config.messages.errorFallback);
    } finally {
      abortCntrlRef.current = null;
      setIsLoading(false);
    }
    return null;
  };

  const displayName = config.transformName ? config.transformName(name.trim()) : name.trim();

  return {
    request: {
      error,
      isLoading,
      reset: () => {
        setError(null);
        setIsLoading(false);
        abortCntrlRef.current?.abort();
      },
      submit: create,
    },
    ident: {
      isValid: !error && !isLoading && !!name.trim(),
      setName,
      name,
    },
    msg: {
      creating: config.messages.creating,
      askToEnter: config.messages.askToEnter,
      valid: `${config.messages.validPrefix} "${displayName}"`,
      error,
    },
  };
}

export function useRemoteAWSBucket<T = any>({
  createRequest,
  defaultName,
}: {
  createRequest: (name: string, { signal }: { signal?: AbortSignal }) => Promise<T>;
  defaultName?: string;
}): {
  request: RemoteItemType.Request<T>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  return useRemoteResource<T>({
    createRequest,
    defaultName,
    config: {
      messages: {
        creating: "Creating S3 bucket...",
        askToEnter: "Enter a name to create a new S3 bucket",
        validPrefix: "Press Enter to create S3 bucket",
        errorFallback: "Failed to create bucket",
      },
      transformName: (name) => name.toLowerCase(), // S3 bucket names must be lowercase
    },
  });
}
