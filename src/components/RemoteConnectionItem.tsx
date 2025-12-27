import { AWSS3Bucket } from "@/api/aws/AWSClient";
import { NetlifySite } from "@/api/netlify/NetlifyTypes";
import { Input } from "@/components/ui/input";
import { RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { VercelProject } from "@/data/remote-auth/RemoteAuthVercelAgent";
import { Repo } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType, useFuzzySearchQuery } from "@/data/useFuzzySearchQuery";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { ApplicationError, errF, isAbortError } from "@/lib/errors/errors";
import { isFuzzyResult } from "@/lib/fuzzy-helpers";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { Ban, Eye, EyeOff, Loader } from "lucide-react";
import { ReactNode, forwardRef, useEffect, useMemo, useRef, useState } from "react";

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

export const RemoteItemCreateInput = forwardRef<
  HTMLInputElement,
  {
    onFocus?: () => void;
    onClose: (val?: string) => void;
    submit: () => void;
    request: RemoteItemType.Request<any>;
    msg: RemoteItemType.Msg;
    ident: RemoteItemType.Ident;
    className?: string;
    placeholder?: string;
    noAutoFocus?: boolean;
    icon?: React.ReactNode;
  }
>(
  (
    {
      onClose,
      request,
      msg,
      onFocus,
      className,
      ident,
      submit,
      placeholder = "my-new-thing",
      noAutoFocus = false,
      icon,
    },
    ref
  ) => {
    const handleBlur = () => onClose(ident.name.trim() || undefined);
    return (
      <div className={cn("w-full relative", className)}>
        <div className="w-full p-0 relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">{icon}</div>
          )}
          <Input
            ref={ref}
            data-no-escape
            autoFocus={!noAutoFocus}
            value={ident.name}
            onChange={(e) => ident.setName(e.target.value)}
            onBlur={handleBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            className={cn("w-full", icon && "pl-10")}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleBlur();
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            disabled={request.isLoading}
          />

          {request.error && (
            <div className="absolute z-20 w-full top-10 bg-sidebar border border-destructive rounded-b-lg shadow-lg">
              <span className="flex items-center px-3 py-2 text-sm text-destructive">
                <Ban className="flex-shrink-0 h-4 w-4 mr-2" />
                <span className="truncate" title={request.error}>
                  {request.error}
                </span>
              </span>
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
                submit();
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="px-3 py-2 text-sm group-hover:text-ring text-muted-foreground truncate">
                {msg.valid}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

RemoteItemCreateInput.displayName = "RemoteItemCreateInput";

type RemoteItem = { element: ReactNode; label: string; value: string };
export function RemoteItemSearchDropDown({
  isLoading,
  searchValue,
  className,
  onFocus,
  onSearchChange,
  onClose,
  onSelect,
  allItems,
  error,
}: {
  isLoading: boolean;
  searchValue: string;
  className?: string;
  onFocus?: (e: React.FocusEvent) => void;
  onSearchChange: (value: string) => void;
  onClose: (inputVal?: string) => void;
  onSelect: (item: RemoteItem) => void;
  error?: string | Error | null;
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
  const showDropdown = !!hasError || !!isLoading || allItems.length > 0 || allItems.length === 0;
  // console.log("Rendering RemoteItemSearchDropDown", { showDropdown, isLoading, allItems, hasError });

  return (
    <Popover.Root open={showDropdown}>
      <div ref={containerRef} className={cn("w-full p-0", className)} onKeyDown={handleKeyDown}>
        <Popover.Anchor asChild>
          <Input
            {...getInputProps()}
            data-no-escape
            autoFocus
            onFocus={(e) => {
              onFocus?.(e);
              e.target.select();
            }}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
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
                  <Ban className="flex-shrink-0 text-destructive h-4 w-4 mr-2" />
                  <span className="text-md font-mono truncate min-w-0" title={error.toString()}>
                    Error {error.toString()}
                  </span>
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
                {allItems.map((item, index) => (
                  <li key={item.value} role="presentation" className="flex w-full flex-col rounded p-1">
                    <button
                      {...getItemProps(index)}
                      onClick={() => handleItemClick(item)}
                      title={item.label}
                      className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
                    >
                      <div className="min-w-0 truncate text-md font-mono">{item.element}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {allItems.length === 0 && !hasError && !isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground italic m-2 p-1 border border-dashed border-accent">
                No Results
              </div>
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

export function useRemoteSearchFn<T = any>(
  fetchAll: RemoteAuthAgentSearchType<T>["fetchAll"],
  hasUpdates: RemoteAuthAgentSearchType<T>["hasUpdates"],
  cacheKey: string,
  {
    config,
    defaultValue = "",
  }: {
    config: RemoteSearchConfig<any>;
    defaultValue?: string;
  }
) {
  return useRemoteSearch<any>({
    agent: {
      fetchAll,
      hasUpdates,
    },
    config,
    defaultValue,
    cacheKey,
  });
}
// Core generic search hook
export function useRemoteSearch<T extends Record<string, any>>({
  agent,
  config,
  defaultValue = "",
  cacheKey,
  disabled = false,
}: {
  agent: RemoteAuthAgentSearchType<T> | null;
  config: RemoteSearchConfig<T>;
  defaultValue?: string;
  cacheKey: string;
  disabled?: boolean;
}) {
  const [searchValue, updateSearch] = useState(defaultValue);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { loading, results, error, clearError, clearCache, reset } = useFuzzySearchQuery<T>(
    agent,
    config.searchKey,
    debouncedSearchValue,
    cacheKey,
    disabled
  );

  const searchResults = useMemo(() => {
    return results?.map((result) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, config, cacheKey]);

  return {
    isLoading: loading || (debouncedSearchValue !== searchValue && Boolean(searchValue)),
    searchValue,
    updateSearch,
    clearError,
    clearCache,
    reset,
    searchResults: searchResults || [],
    error,
  };
}

export function useRemoteNetlifySearch({
  agent,
  defaultValue = "",
  cacheKey,
}: {
  agent: RemoteAuthAgentSearchType<NetlifySite> | null;
  defaultValue?: string;
  cacheKey: string;
}) {
  return useRemoteSearch<NetlifySite>({
    agent,
    config: {
      searchKey: "name",
    },
    defaultValue,
    cacheKey,
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

export function useRemoteVercelProjectSearch({
  agent,
  defaultValue = "",
  cacheKey,
}: {
  agent: RemoteAuthAgentSearchType<VercelProject> | null;
  defaultValue?: string;
  cacheKey: string;
}) {
  return useRemoteSearch<VercelProject>({
    agent,
    config: {
      searchKey: "name",
      mapResult: (project, highlightedElement) => ({
        label: project.name,
        value: project.name,
        element: highlightedElement || project.name,
      }),
    },
    cacheKey,
    defaultValue,
  });
}

export function useRemoteGitRepoSearch({
  agent,
  defaultValue = "",
  cacheKey,
}: {
  agent: RemoteAuthAgentSearchType<Repo> | null;
  defaultValue?: string;
  cacheKey: string;
}) {
  return useRemoteSearch<Repo>({
    agent,
    config: {
      searchKey: "full_name",
      mapResult: (repo, highlightedElement) => ({
        label: repo.full_name,
        // value: repo.html_url,
        value: repo.full_name,
        element: (
          <div className="flex items-center gap-2">
            {repo.private ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{highlightedElement || repo.full_name}</span>
          </div>
        ),
      }),
    },
    cacheKey,
    defaultValue,
  });
}

export function useRemoteGitRepo({
  agent,
  defaultName,
  repoPrefix = "",
  onCreate,
  visibility = "public",
}: {
  agent: RemoteAuthGithubAgent | null;
  defaultName?: string;
  repoPrefix?: string;
  onCreate?: (result: Awaited<ReturnType<RemoteAuthGithubAgent["createRepo"]>>["data"]) => void;
  visibility?: "public" | "private";
}): {
  request: RemoteItemType.Request<any>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  const result = useRemoteResource<any>({
    createRequest: async (name: string, options: { signal?: AbortSignal }): Promise<any> => {
      if (!agent) throw new Error("No agent provided");
      const response = await agent.createRepo({ repoName: name, private: visibility === "private" }, options);
      const createdResult = { name: response.data.full_name };
      if (onCreate) onCreate(response.data);
      return createdResult;
    },
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

export function useRemoteCloudflareProject({
  createRequest,
  defaultName,
}: {
  createRequest: (name: string, { signal }: { signal?: AbortSignal }) => Promise<any>;
  defaultName?: string;
}): {
  request: RemoteItemType.Request<any>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  return useRemoteResource<any>({
    createRequest,
    defaultName,
    config: {
      messages: {
        creating: "Creating Cloudflare project...",
        askToEnter: "Enter a name to create a new Cloudflare project",
        validPrefix: "Press Enter to create Cloudflare project",
        errorFallback: "Failed to create project",
      },
    },
  });
}

export function useRemoteVercelProject({
  createRequest,
  defaultName,
}: {
  createRequest: (name: string, { signal }: { signal?: AbortSignal }) => Promise<VercelProject>;
  defaultName?: string;
}): {
  request: RemoteItemType.Request<VercelProject>;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  const result = useRemoteResource<VercelProject>({
    createRequest,
    defaultName,
    config: {
      messages: {
        creating: "Creating project...",
        askToEnter: "Enter a name to create a new project",
        validPrefix: "Press Enter to create project",
        errorFallback: "Failed to create project",
      },
    },
  });

  return {
    ...result,
    msg: {
      ...result.msg,
      valid: `Press Enter to create project "${result.ident.name.trim()}"`,
    },
  };
}

export function useRemoteAWSSearch({
  agent,
  defaultValue = "",
  cacheKey,
}: {
  agent: RemoteAuthAgentSearchType<AWSS3Bucket> | null;
  defaultValue?: string;
  cacheKey: string;
}) {
  return useRemoteSearch<AWSS3Bucket>({
    agent,
    config: {
      searchKey: "name",
    },
    cacheKey,
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
  const [name, setNameInternal] = useState(defaultName || "");

  const setName = (newName: string) => {
    setNameInternal(newName);
    if (error) {
      setError(null);
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortCntrlRef = useRef<AbortController | null>(null);

  const create = async () => {
    if (!name.trim()) return null;

    setIsLoading(true);
    setError(null);
    try {
      abortCntrlRef.current = new AbortController();
      const result = await createRequest(name.trim(), { signal: abortCntrlRef.current.signal });
      setError(null);
      abortCntrlRef.current = null;
      setIsLoading(false);
      return result;
    } catch (err: any) {
      if (isAbortError(err)) {
        // Aborted, do nothing
        abortCntrlRef.current = null;
        setIsLoading(false);
        return null;
      }
      console.error(errF`Remote resource creation failed: ${err}`);
      setError(err instanceof ApplicationError ? err.getHint() : err.message || config.messages.errorFallback);
      abortCntrlRef.current = null;
      setIsLoading(false);
      throw err;
    }
  };

  const displayName = name.trim();
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
    },
  });
}
