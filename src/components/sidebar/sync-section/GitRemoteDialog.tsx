import { zodResolver } from "@hookform/resolvers/zod";
import React, { useMemo } from "react";
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
import { GitBranch } from "lucide-react";

import { GitAuthSelect } from "@/components/AuthSelect";
import { ConnectionsModalContent } from "@/components/connections-modal/ConnectionsModal";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ErrorMiniPlaque } from "@/components/errors/ErrorPlaque";
import { RemoteResource } from "@/components/publish-modal/RemoteResourceField";
import { useRemoteGitRepo, useRemoteGitRepoSearch } from "@/components/RemoteConnectionItem";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { RemoteAuthGithubAPIAgent } from "@/data/remote-auth/RemoteAuthGithubAPIAgent";
import { GitRemote } from "@/features/git-repo/GitRepo";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { ENV } from "@/lib/env";
import { cn } from "@/lib/utils";
import { GithubAPIRemoteAuthDAO, RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { useImperativeHandle, useState } from "react";

const gitRemoteSchema = z.object({
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
    url: "https://github.com/rbbydotdev/test123",
    gitCorsProxy: ENV.GIT_PROTOCOL_PROXY,
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
          // if (event.target instanceof HTMLElement && event.target.closest(`#${REPO_URL_SEARCH_ID}`)) {
          if (event.target instanceof HTMLElement && event.target.closest("[data-no-escape]")) {
            event.preventDefault();
          }
        }}
      >
        <div className="grid relative max-w-full w-full min-w-0">
          <div className="col-start-1 row-start-1">
            <ConnectionsModalContent
              className={cn("w-full min-w-0", { hidden: !showConnectionModal })}
              connection={null}
              mode={"add"}
              sources={["github", "custom"]}
              onSuccess={(rad) => {
                form.setValue("authId", rad.guid);
                setShowConnModal(false);
              }}
              onClose={() => setShowConnModal(false)}
            >
              <DialogHeader>
                <DialogTitle>Connect to API</DialogTitle>
                <DialogDescription>Connect to API</DialogDescription>
              </DialogHeader>
            </ConnectionsModalContent>
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
  const { currentWorkspace } = useWorkspaceContext();

  const authId = useWatch({ name: "authId", control: form.control });
  const remoteAuth = useRemoteAuthForm(authId);

  // const storageObject = useRef({}).current;
  // Search functionality
  const searchAgent = useMemo(
    () => (remoteAuth ? new RemoteAuthGithubAPIAgent(remoteAuth as GithubAPIRemoteAuthDAO) : null),
    [remoteAuth]
  );
  const {
    isLoading: searchLoading,
    searchValue,
    updateSearch,
    searchResults,
    error: searchError,
    setEnabled,
  } = useRemoteGitRepoSearch({
    agent: searchAgent,
    defaultValue: TryPathname(form.getValues("url"))
      .replace(/^\//, "")
      .replace(/\.git$/, ""),
  });

  // Create functionality
  const createAgent = useRemoteAuthAgent<RemoteAuthGithubAgent>(remoteAuth);
  const { ident, msg, request } = useRemoteGitRepo({
    createRequest: async (name: string, options: { signal?: AbortSignal }) => {
      if (!createAgent) {
        throw new Error("No authentication configured for repository creation");
      }
      const response = await createAgent.createRepo(name, options);
      return response.data;
    },
    defaultName: currentWorkspace.name,
  });

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
                  <GitAuthSelect
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
          <div data-no-escape className="w-full">
            <RemoteResource.Root
              control={form.control}
              fieldName="url"
              onValueChange={(value) => form.setValue("url", value)}
              getValue={() => form.getValues("url")}
            >
              {authId && remoteAuth?.hasRemoteApi() && (
                <>
                  <RemoteResource.Search
                    label="Repository"
                    isLoading={searchLoading}
                    searchValue={searchValue}
                    onActive={() => setEnabled(true)}
                    onSearchChange={updateSearch}
                    searchResults={searchResults}
                    error={searchError}
                  />
                  <RemoteResource.Create
                    label="New Repository Name"
                    placeholder={"my-new-repo"}
                    ident={{
                      ...ident,
                      name: ident.name,
                      setName: (value: string) => {
                        ident.setName(value);
                      },
                    }}
                    msg={msg}
                    request={{
                      ...request,
                      submit: async () => {
                        const result = await request.submit();
                        return result ? { name: result.html_url } : null;
                      },
                    }}
                  />
                </>
              )}
              <RemoteResource.InputField
                label={
                  authId && remoteAuth?.hasRemoteApi()
                    ? "URL"
                    : "URL (Select a remote authentication to search or create)"
                }
                placeholder="https://github.com/user/repo.git"
              >
                {authId && remoteAuth?.hasRemoteApi() && (
                  <>
                    <div>
                      <RemoteResource.CreateButton
                        title="Create Repository"
                        ident={ident}
                        createReset={() => request.reset()}
                      />
                    </div>
                    <RemoteResource.SearchButton
                      title="Search Repositories"
                      onSearchChange={updateSearch}
                      searchReset={() => setEnabled(false)}
                    />
                  </>
                )}
              </RemoteResource.InputField>
            </RemoteResource.Root>
          </div>

          <FormField
            control={form.control}
            name="gitCorsProxy"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Git CORS Proxy</FormLabel>
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
