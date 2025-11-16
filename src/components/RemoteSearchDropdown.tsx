import { Input } from "@/components/ui/input";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthAgent";
import { AgentFromRemoteAuth } from "@/data/RemoteAuthToAgent";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { Ban, Loader } from "lucide-react";
import React, { ReactNode, useMemo, useState } from "react";

// const { msg, request, isValid, name, setName } = useAccountItem({ remoteAuth, defaultName: workspaceName });
type RemoteRequestType = {
  error: string | null;
  isLoading: boolean;
  create: (onCreate: (url: string) => void) => Promise<void>;
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
  export type Request = RemoteRequestType;
  export type Msg = RemoteRequestMsgType;
  export type Ident = RemoteRequestIdentType;
}

function RemoteItemCreateInput({
  onClose,
  onCreated,
  request,
  msg,
  ident,
}: {
  onClose: () => void;
  onCreated: (repoUrl: string) => void;
  request: RemoteItemType.Request;
  msg: RemoteItemType.Msg;
  ident: RemoteItemType.Ident;
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
    <div className="w-full relative">
      <div className="w-full p-0 relative">
        <Input
          autoFocus
          value={ident.name}
          onChange={(e) => ident.setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"my-new-repo"}
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

        {!ident.isValid && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="px-3 py-2 text-sm text-muted-foreground">{msg.valid}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function useGithubRemoteItem({ remoteAuth, defaultName }: { remoteAuth: null | RemoteAuthDAO; defaultName?: string }): {
  request: RemoteItemType.Request;
  ident: RemoteItemType.Ident;
  msg: RemoteItemType.Msg;
} {
  const [name, setName] = useState(defaultName || "");
  const agent = useMemo(() => AgentFromRemoteAuth(remoteAuth) as RemoteAuthGithubAgent, [remoteAuth]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortCntrlRef = React.useRef<AbortController | null>(null);

  const handleCreateRepo = async (onCreate: (url: string) => void) => {
    const finalRepoName = name.trim();
    if (!agent) {
      return console.warn("No agent available for creating repository");
    }
    if (!finalRepoName) return;
    setIsLoading(true);
    setError(null);
    try {
      abortCntrlRef.current = new AbortController();
      const repoUrl = (await agent.createRepo(finalRepoName, { signal: abortCntrlRef.current.signal }))?.data?.html_url;
      setError(null);
      return onCreate(repoUrl);
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
      create: handleCreateRepo,
    },
    ident: {
      isValid: !error && !isLoading && !!name.trim(),
      setName,
      name,
    },
    msg: {
      creating: "Creating repository...",
      askToEnter: "Enter a name to create a new repository",
      valid: `Press Enter to create repository "${name.trim()}"`,
      error,
    },
  };
}
type RemoteItem = { element: ReactNode; label: string; value: string };
export function RemoteSearchDropDown({
  isLoading,
  searchValue,
  onSearchChange,
  onClose,
  onSelect,
  allItems,
  error,
}: {
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (item: RemoteItem) => void;
  error?: string | null;
  allItems: RemoteItem[];
}) {
  const {
    // activeIndex,
    resetActiveIndex,
    containerRef,
    handleKeyDown,
    getInputProps,
    getMenuProps,
    getItemProps,
    // isItemActive,
  } = useKeyboardNavigation({
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
  React.useEffect(() => {
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
    <div ref={containerRef} className="w-full p-0 relative" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <Input
        {...getInputProps()}
        autoFocus
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search..."
        className="w-full"
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
