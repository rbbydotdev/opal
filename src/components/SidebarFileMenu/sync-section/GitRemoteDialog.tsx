import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Ban, GitBranch, Loader, Plus, Search } from "lucide-react";

import { AuthSelect } from "@/components/AuthSelect";
import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorMiniPlaque } from "@/components/ErrorPlaque";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDebounce } from "@/context/useDebounce";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { isFuzzyResult, useRepoSearch } from "@/Db/useGithubRepoSearch";
import { GitRemote } from "@/features/git-repo/GitRepo";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { Env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useImperativeHandle, useMemo, useState } from "react";

export const gitRemoteSchema = z.object({
  name: z
    .string()
    .min(1, "Remote name is required")
    .max(100, "Remote name is too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Remote name can only contain letters, numbers, dots, underscores, and dashes"),
  url: z
    .string()
    .min(1, "Remote URL is required")
    .url("Remote URL must be a valid URL")
    .regex(/^(https?|git|ssh|file):\/\/|^git@/, "Remote URL must be a valid Git URL"),
  gitCorsProxy: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .refine(
      (val) => val === undefined || (typeof val === "string" && /^https?:\/\//.test(val)),
      "CORS Proxy must be a valid HTTP/HTTPS URL"
    ),
  authId: z.string().optional(),
});

type GitRemoteFormValues = z.infer<typeof gitRemoteSchema>;

const GitRemoteDialogModes = {
  ADD: "add",
  EDIT: "edit",
} as const;
type GitRemoteDialogModeType = (typeof GitRemoteDialogModes)[keyof typeof GitRemoteDialogModes];

const DescForMode = {
  [GitRemoteDialogModes.ADD]: "Add a new Git remote to your repository.",
  [GitRemoteDialogModes.EDIT]: "Edit an existing Git remote in your repository.",
};

const TitleForMode = {
  [GitRemoteDialogModes.ADD]: "Add Git Remote",
  [GitRemoteDialogModes.EDIT]: "Edit Git Remote",
};
export function useGitRemoteDialogMode(
  defaultMode: GitRemoteDialogModeType = GitRemoteDialogModes.ADD
): [GitRemoteDialogModeType, (mode: GitRemoteDialogModeType) => void] {
  return useState<GitRemoteDialogModeType>(defaultMode);
}
type GitRemoteDialogResult = {
  previous: null | GitRemote;
  next: GitRemote | null;
  mode: GitRemoteDialogModeType;
};
const NULL_GIT_REMOTE_DIALOG_RESULT: GitRemoteDialogResult = {
  previous: null,
  next: null,
  mode: GitRemoteDialogModes.ADD,
};

type GitRemoteDialogCmdRefType = {
  open: (mode: GitRemoteDialogModeType, previous?: GitRemote) => Promise<GitRemoteDialogResult>;
};
export function useGitRemoteDialogCmd() {
  return React.useRef<GitRemoteDialogCmdRefType>({
    open: async () => NULL_GIT_REMOTE_DIALOG_RESULT,
  });
}
const TryPathname = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};
const REPO_URL_SEARCH_ID = "repo-url-search";
export function GitRemoteDialog({
  children,
  defaultName = "origin",
  onSubmit,
  cmdRef,
}: {
  children?: React.ReactNode;
  defaultName?: string;
  onSubmit?: (values: GitRemoteDialogResult & { next: GitRemote }) => void;
  cmdRef: React.RefObject<GitRemoteDialogCmdRefType>;
}) {
  const defaultValues = {
    name: defaultName,
    // url: "https://github.com/user/repo",
    url: "",
    gitCorsProxy: Env.GitProtocolProxy,
  };

  const form = useForm<GitRemoteFormValues>({
    resolver: zodResolver(gitRemoteSchema),
    defaultValues,
  });
  const prevRef = React.useRef<GitRemote | null>(null);
  const modeRef = React.useRef<GitRemoteDialogModeType>(GitRemoteDialogModes.ADD);
  const [showConnectionModal, setShowConnModal] = React.useState(false);
  const deferredPromiseRef = React.useRef<PromiseWithResolvers<GitRemoteDialogResult> | null>(null);

  useImperativeHandle(
    cmdRef,
    () =>
      ({
        open: (mode: GitRemoteDialogModeType, previous?: GitRemote) => {
          deferredPromiseRef.current = Promise.withResolvers();
          if (mode === "edit") {
            form.reset({ ...defaultValues, ...previous });
          }
          modeRef.current = mode;
          prevRef.current = previous ?? null;
          setOpen(true);
          return deferredPromiseRef.current.promise;
        },
      }) satisfies GitRemoteDialogCmdRefType
  );
  const [open, setOpen] = useState(false);

  // Cleanup effect to ensure promise is always resolved
  React.useEffect(() => {
    return () => {
      deferredPromiseRef.current?.resolve(NULL_GIT_REMOTE_DIALOG_RESULT);
      deferredPromiseRef.current = null;
    };
  }, []);

  function handleDialogOpenChange(isOpen: boolean) {
    if (showConnectionModal) {
      setShowConnModal(false);
      return;
    }
    setOpen(isOpen);
    if (!isOpen) {
      // Dialog is closing - resolve promise with null (cancelled)
      deferredPromiseRef.current?.resolve(NULL_GIT_REMOTE_DIALOG_RESULT);
      deferredPromiseRef.current = null;
      setShowConnModal(false);
      prevRef.current = null;
      modeRef.current = GitRemoteDialogModes.ADD;
      form.reset(defaultValues);
    }
  }

  function handleFormSubmit(values: GitRemoteFormValues) {
    const result = { previous: prevRef.current, next: values, mode: modeRef.current };

    // Call legacy onSubmit if provided for backward compatibility
    onSubmit?.(result);

    // Resolve promise with result
    deferredPromiseRef.current?.resolve(result);
    deferredPromiseRef.current = null;
    setOpen(false);
  }

  function handleCancel() {
    // Resolve promise with null (cancelled)
    deferredPromiseRef.current?.resolve(NULL_GIT_REMOTE_DIALOG_RESULT);
    deferredPromiseRef.current = null;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest(`#${REPO_URL_SEARCH_ID}`)) {
            event.preventDefault();
          }
        }}
      >
        <div className="grid relative max-w-full w-full min-w-0">
          <div className="col-start-1 row-start-1">
            <ConnectionsModalContent
              className={cn("w-full min-w-0", { hidden: !showConnectionModal })}
              mode={"add"}
              onSuccess={(rad) => {
                form.setValue("authId", rad.guid);
                setShowConnModal(false);
              }}
              onClose={() => setShowConnModal(false)}
            />
          </div>
          <ErrorBoundary fallback={ErrorMiniPlaque}>
            <GitRemoteDialogInternal
              className={cn("col-start-1 row-start-1 min-w-0", { invisible: showConnectionModal })}
              mode={modeRef.current}
              form={form}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              onAddAuth={() => setShowConnModal(true)}
            />
          </ErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function useRemoteAuthForm(authId: string | undefined) {
  const [remoteAuth, setRemoteAuth] = useState<null | RemoteAuthDAO>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffect(async () => {
    if (authId) setRemoteAuth(await RemoteAuthDAO.GetByGuid(authId));
  }, [authId]);
  return remoteAuth;
}
function GitRemoteDialogInternal({
  className,
  mode,
  onSubmit,
  onAddAuth,
  onCancel,
  form,
}: {
  className?: string;
  mode: GitRemoteDialogModeType;
  onSubmit: (values: GitRemoteFormValues) => void;
  onAddAuth: () => void;
  onCancel: () => void;
  form: ReturnType<typeof useForm<GitRemoteFormValues>>;
}) {
  const [urlMode, setUrlMode] = useState<"manual" | "search" | "create">("manual");
  const { currentWorkspace } = useWorkspaceContext();

  const authId = useWatch({ name: "authId", control: form.control });
  const remoteAuth = useRemoteAuthForm(authId);

  return (
    <div className={className}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          {TitleForMode[mode]}
        </DialogTitle>
        <DialogDescription>{DescForMode[mode]}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-w-0">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" placeholder="origin" className="truncate" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="authId"
            render={({ field }) => (
              <FormItem className="w-full min-w-0">
                <FormLabel>Authentication</FormLabel>
                <FormControl>
                  <AuthSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Optional - Select authentication"
                    onAddAuth={onAddAuth}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end gap-2 justify-end w-full">
            <div id={REPO_URL_SEARCH_ID} className="w-full">
              <FormItem className="min-w-0 w-full">
                <FormLabel>
                  {urlMode === "manual" ? (
                    <>
                      URL
                      <span className={cn({ hidden: authId && remoteAuth?.hasRemoteApi() }, "text-xs mono ml-2")}>
                        (Select a remote authentication to search or create)
                      </span>
                    </>
                  ) : urlMode === "search" ? (
                    "Repo Name"
                  ) : (
                    "New Repository Name"
                  )}
                </FormLabel>
                {urlMode === "search" && (
                  <RepoSearchContainer
                    remoteAuth={remoteAuth}
                    defaultValue={TryPathname(form.getValues("url"))
                      .replace(/^\//, "")
                      .replace(/\.git$/, "")}
                    onClose={() => setUrlMode("manual")}
                    onSelect={(repo) => {
                      form.setValue("url", repo.value);
                      setUrlMode("manual");
                    }}
                  />
                )}
                {urlMode === "create" && (
                  <RepoCreateContainer
                    remoteAuth={remoteAuth}
                    workspaceName={currentWorkspace.name}
                    onClose={() => setUrlMode("manual")}
                    onCreated={(repoUrl) => {
                      form.setValue("url", repoUrl);
                      setUrlMode("manual");
                    }}
                  />
                )}
                {urlMode === "manual" && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <>
                        <FormControl>
                          <Input
                            required
                            autoComplete="off"
                            placeholder="https://github.com/user/repo.git"
                            className="truncate"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </>
                    )}
                  />
                )}
              </FormItem>
            </div>
            <div className="flex gap-1">
              <Button
                variant={urlMode === "search" ? "default" : "outline"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  setUrlMode(urlMode === "search" ? "manual" : "search");
                }}
                className={cn({ hidden: !authId || !remoteAuth?.hasRemoteApi() })} // Hide button if no auth selected
              >
                <Search />
              </Button>
              <Button
                variant={urlMode === "create" ? "default" : "outline"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  setUrlMode(urlMode === "create" ? "manual" : "create");
                }}
                className={cn({ hidden: !authId || !remoteAuth?.hasRemoteApi() })} // Hide button if no auth selected
              >
                <Plus />
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="gitCorsProxy"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>
                  Git CORS Proxy <OptionalProbablyToolTip />
                </FormLabel>
                <FormControl>
                  <Input autoComplete="off" placeholder="Optional" className="truncate" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">OK</Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}

type GithubSearchReposResult = {
  label: string;
  value: string;
  element: React.ReactNode;
};
function RepoSearchContainer({
  remoteAuth,
  defaultValue,
  onClose,
  onSelect,
}: {
  remoteAuth: null | RemoteAuthDAO;
  defaultValue: string;
  onClose: () => void;
  onSelect: (repo: GithubSearchReposResult) => void;
}) {
  const [searchValue, updateSearch] = useState(defaultValue);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const agent = useMemo(() => remoteAuth?.toAgent() || null, [remoteAuth]);
  const { isLoading, results, error } = useRepoSearch(agent, debouncedSearchValue);
  const searchResults = useMemo(() => {
    return results.map((repo) => {
      if (isFuzzyResult(repo)) {
        return {
          label: repo.obj.full_name,
          value: repo.obj.html_url,
          element: repo.highlight((m, i) => (
            <b className="text-highlight-foreground" key={i}>
              {m}
            </b>
          )),
        };
      } else {
        return {
          label: repo.full_name,
          value: repo.html_url,
          element: repo.full_name,
        };
      }
    });
  }, [results]);

  return (
    <div className="w-full relative">
      <RepoDropDown
        isLoading={isLoading || (debouncedSearchValue !== searchValue && Boolean(searchValue))}
        allRepos={searchResults}
        searchValue={searchValue}
        onSearchChange={updateSearch}
        onClose={onClose}
        error={error}
        onSelect={onSelect}
      />
    </div>
  );
}

function RepoDropDown({
  isLoading,
  searchValue,
  onSearchChange,
  onClose,
  onSelect,
  allRepos,
  error,
}: {
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (repo: GithubSearchReposResult) => void;
  error?: string | null;
  allRepos: GithubSearchReposResult[];
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
      if (activeIndex >= 0 && activeIndex < allRepos.length) {
        onSelect(allRepos[activeIndex]!);
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

  const handleItemClick = (repo: GithubSearchReposResult) => {
    onSelect(repo);
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
        placeholder="Search repositories..."
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

      {!hasError && !isLoading && allRepos.length > 0 && (
        <ul
          {...getMenuProps()}
          className="text-xs block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-sidebar drop-shadow-lg absolute top-10 z-10"
        >
          {allRepos.map((repo, index) => (
            <li key={repo.value} role="presentation" className="flex w-full flex-col rounded p-1">
              <button
                {...getItemProps(index)}
                onClick={() => handleItemClick(repo)}
                className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 _bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
              >
                <div className="min-w-0 truncate text-md font-mono _text-sidebar-foreground/70">{repo.element}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {allRepos.length === 0 && searchValue && (
        <div className="absolute w-full top-10 z-10 bg-sidebar border border-t-0 rounded-b-lg shadow-lg">
          <div className="px-3 py-2 text-sm text-muted-foreground">No repositories found</div>
        </div>
      )}
    </div>
  );
}

function RepoCreateContainer({
  remoteAuth,
  workspaceName,
  onClose,
  onCreated,
}: {
  remoteAuth: null | RemoteAuthDAO;
  workspaceName: string;
  onClose: () => void;
  onCreated: (repoUrl: string) => void;
}) {
  const [repoName, setRepoName] = useState(workspaceName || "");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agent = useMemo(() => remoteAuth?.toAgent() || null, [remoteAuth]);

  // Get username from auth if available
  const username = useMemo(() => {
    if (!agent) return "";
    if ("login" in (remoteAuth?.data || {})) {
      return (remoteAuth?.data as any).login;
    }
    return agent.getUsername() === "x-access-token" ? "" : agent.getUsername();
  }, [agent, remoteAuth]);

  const handleCreateRepo = async () => {
    if (!agent || !repoName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const githubAgent = agent as any;
      if (!githubAgent.octokit) {
        throw new Error("GitHub API not available");
      }

      const response = await githubAgent.octokit.request("POST /user/repos", {
        name: repoName.trim(),
        private: true,
        auto_init: false,
      });

      onCreated(response.data.html_url);
    } catch (err: any) {
      setError(err.message || "Failed to create repository");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating && repoName.trim()) {
      e.preventDefault();
      return handleCreateRepo();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const prefixedValue = username ? `${username}/` : "";
  const displayValue = repoName.startsWith(prefixedValue) ? repoName : prefixedValue + repoName;

  return (
    <div className="w-full relative">
      <div className="w-full p-0 relative">
        <Input
          autoFocus
          // onBlurCapture={}
          value={displayValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(prefixedValue)) {
              setRepoName(value.slice(prefixedValue.length));
            } else {
              setRepoName(value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={`${prefixedValue}my-new-repo`}
          className="w-full"
          disabled={isCreating}
        />

        {error && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border border-destructive rounded-b-lg shadow-lg">
            <div className="flex items-center px-3 py-2 text-sm text-destructive">
              <Ban className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {isCreating && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Creating repository...
            </div>
          </div>
        )}

        {!error && !isCreating && repoName.trim() && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Press Enter to create repository "{username ? `${username}/` : ""}
              {repoName.trim()}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
