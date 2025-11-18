import { Input } from "@/components/ui/input";
import { useDebounce } from "@/context/useDebounce";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthAgent";
import { AgentFromRemoteAuth } from "@/data/RemoteAuthToAgent";
import { Repo } from "@/data/RemoteAuthTypes";
import { useAnySearch } from "@/data/useGithubRepoSearch";
import { IRemoteAuthAgentSearch, isFuzzyResult } from "@/data/useRemoteSearch";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { NetlifySite } from "@/lib/netlify/NetlifyClient";
import { cn } from "@/lib/utils";
import { Ban, Loader } from "lucide-react";
import React, { ReactNode, useEffect, useEffectEvent, useMemo, useState } from "react";

// const { msg, request, isValid, name, setName } = useAccountItem({ remoteAuth, defaultName: workspaceName });
type RemoteRequestType<T = any> = {
  error: string | null;
  isLoading: boolean;
  create: (onCreate: (result: T) => void) => Promise<void>;
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
  onCreated,
  msg,
  className,
  ident,
  placeholder = "my-new-thing",
}: {
  onClose: () => void;
  onCreated: (result: T) => void;
  request: RemoteItemType.Request<T>;
  msg: RemoteItemType.Msg;
  ident: RemoteItemType.Ident;
  className?: string;
  placeholder?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && ident.isValid) {
      e.preventDefault();
      return request.create(onCreated);
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
          onBlur={() => onClose()}
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
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="px-3 py-2 text-sm text-muted-foreground">{msg.valid}</div>
          </div>
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
  onClose: () => void;
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
      onEscape: onClose,
      searchValue,
      onSearchChange,
      wrapAround: true,
    });

  // Reset active index when filtered repos change
  useEffect(() => {
    resetActiveIndex();
  }, [resetActiveIndex]);

  const handleItemClick = (item: RemoteItem) => {
    onSelect(item);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Close dropdown if focus moves outside the component
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      onClose();
    }
  };
  const hasError = !!error;

  return (
    <div
      ref={containerRef}
      className={cn("w-full p-0 relative", className)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <Input
        {...getInputProps()}
        data-no-escape
        autoFocus
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search..."
        className="w-full"
        // onKeyDown={
      />
      {hasError && (
        <ul
          {...getMenuProps()}
          className="absolute z-20 text-xs block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-sidebar drop-shadow-lg top-10"
        >
          <li className="flex w-full flex-col rounded p-1 ">
            <div className="group flex h-8 min-w-0 items-center rounded-md justify-start border-destructive border px-2 py-5">
              <Ban className="text-destructive h-4 w-4 mr-2" />
              <span className="text-md font-mono truncate min-w-0">Error {error}</span>
            </div>
          </li>
        </ul>
      )}
      {!hasError && isLoading && (
        <ul
          {...getMenuProps()}
          className="absolute z-20 text-xs block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-sidebar drop-shadow-lg top-10"
        >
          <li className="flex w-full flex-col rounded p-1">
            <div className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2  px-2 py-5">
              <Loader className="animate-spin h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-md font-mono shimmer-text">Loading...</span>
            </div>
          </li>
        </ul>
      )}

      {!hasError && !isLoading && allItems.length > 0 && (
        <ul
          {...getMenuProps()}
          className="text-xs block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-sidebar drop-shadow-lg absolute top-10 z-10"
        >
          {allItems.map((repo, index) => (
            <li key={repo.value} role="presentation" className="flex w-full flex-col rounded p-1">
              <button
                {...getItemProps(index)}
                onClick={() => handleItemClick(repo)}
                className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 _bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
              >
                <div className="min-w-0 truncate text-md font-mono">{repo.element}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {allItems.length === 0 && searchValue && (
        <div className="absolute w-full top-10 z-10 bg-sidebar border border-t-0 rounded-b-lg shadow-lg">
          <div className="px-3 py-2 text-sm text-muted-foreground">None found</div>
        </div>
      )}
    </div>
  );
}

export function useRemoteNetlifySearch({
  agent,
  defaultValue = "",
}: {
  agent: IRemoteAuthAgentSearch<NetlifySite> | null;
  defaultValue?: string;
}) {
  const [searchValue, updateSearch] = useState(defaultValue);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { loading, results, error } = useAnySearch<NetlifySite>({
    agent,
    searchTerm: debouncedSearchValue,
    searchKey: "name",
  });
  const searchResults = useMemo(() => {
    return results.map((result) => {
      return {
        label: isFuzzyResult<NetlifySite>(result) ? result.obj.name : result.name,
        value: isFuzzyResult<NetlifySite>(result) ? result.obj.name : result.name,
        element: isFuzzyResult<NetlifySite>(result)
          ? result.highlight((m, i) => (
              <b className="text-ring" key={i}>
                {m}
              </b>
            ))
          : result.name,
      };
    });
  }, [results]);
  return {
    isLoading: loading || (debouncedSearchValue !== searchValue && Boolean(searchValue)),
    searchValue,
    updateSearch,
    searchResults,
    error,
  };
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
  const [name, setName] = useState(defaultName || "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortCntrlRef = React.useRef<AbortController | null>(null);

  const create = async (onCreate: (result: T) => void) => {
    const finalName = name.trim();
    if (!finalName) return;
    setIsLoading(true);
    setError(null);
    try {
      abortCntrlRef.current = new AbortController();
      const result = await createRequest(finalName, { signal: abortCntrlRef.current.signal });
      setError(null);
      return onCreate(result);
    } catch (err: any) {
      setError(err.message || "Failed to create");
    } finally {
      abortCntrlRef.current = null;
      setIsLoading(false);
    }
  };
  return {
    request: {
      error,
      isLoading,
      reset: () => {
        setError(null);
        setIsLoading(false);
        abortCntrlRef.current?.abort();
      },
      create,
    },
    ident: {
      isValid: !error && !isLoading && !!name.trim(),
      setName,
      name,
    },
    msg: {
      creating: "Creating Netlify site...",
      askToEnter: "Enter a name to create a new Netlify site",
      valid: `Press Enter to create Netlify site "${name.trim()}"`,
      error,
    },
  };
}

export function useRemoteGitRepoSearch({
  agent,
  defaultValue = "",
}: {
  agent: IRemoteAuthAgentSearch<Repo> | null;
  defaultValue?: string;
}) {
  const [searchValue, updateSearch] = useState(defaultValue);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { loading, results, error } = useAnySearch<Repo>({
    agent,
    searchTerm: debouncedSearchValue,
    searchKey: "full_name",
  });
  const searchResults = useMemo(() => {
    return results.map((repo) => {
      return {
        label: isFuzzyResult<Repo>(repo) ? repo.obj.full_name : repo.full_name,
        value: isFuzzyResult<Repo>(repo) ? repo.obj.html_url : repo.html_url,
        element: isFuzzyResult<Repo>(repo)
          ? repo.highlight((m, i) => (
              <b className="text-highlight-foreground" key={i}>
                {m}
              </b>
            ))
          : repo.full_name,
      };
    });
  }, [results]);
  return {
    isLoading: loading || (debouncedSearchValue !== searchValue && Boolean(searchValue)),
    searchValue,
    updateSearch,
    searchResults,
    error,
  };
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
  const [name, setName] = useState(defaultName || "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortCntrlRef = React.useRef<AbortController | null>(null);

  const create = async (onCreate: (result: T) => void) => {
    const finalName = name.trim();
    if (!finalName) return;
    setIsLoading(true);
    setError(null);
    try {
      abortCntrlRef.current = new AbortController();
      const result = await createRequest(finalName, { signal: abortCntrlRef.current.signal });
      setError(null);
      return onCreate(result);
    } catch (err: any) {
      setError(err.message || "Failed to create repository");
    } finally {
      abortCntrlRef.current = null;
      setIsLoading(false);
    }
  };

  return {
    request: {
      error,
      isLoading,
      reset: () => {
        setError(null);
        setIsLoading(false);
        abortCntrlRef.current?.abort();
      },
      create,
    },
    ident: {
      isValid: !error && !isLoading && !!name.trim(),
      setName,
      name,
    },
    msg: {
      creating: "Creating repository...",
      askToEnter: "Enter a name to create a new repository",
      valid: `Press Enter to create repository "${repoPrefix}${name.trim()}"`,
      error,
    },
  };
}

export function useGitHubRepoCreation({ remoteAuth }: { remoteAuth: RemoteAuthDAO | null }) {
  const agent = useMemo(() => AgentFromRemoteAuth(remoteAuth), [remoteAuth]);

  const username = useMemo(() => {
    if (!agent) return "";
    if ("login" in (remoteAuth?.data || {})) {
      return (remoteAuth?.data as any).login;
    }
    return agent.getUsername() === "x-access-token" ? "" : agent.getUsername();
  }, [agent, remoteAuth]);

  const repoPrefix = username ? `${username}/` : "";

  const createRequest = useEffectEvent(async (name: string, { signal }: { signal?: AbortSignal }) => {
    if (!agent) {
      throw new Error("No agent available for creating repository");
    }
    if (!(agent instanceof RemoteAuthGithubAgent)) {
      throw new Error("Unsupported Git provider for repository creation");
    }
    const response = await agent.octokit.request("POST /user/repos", {
      name,
      private: true,
      auto_init: false,
    });
    return response.data;
  });

  return {
    createRequest,
    repoPrefix,
    username,
  };
}
