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
import { GitBranch, Search } from "lucide-react";

import { AuthSelect } from "@/components/AuthSelect";
import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { GitRemote } from "@/features/git-repo/GitRepo";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { Env } from "@/lib/env";
import { relPath } from "@/lib/paths2";
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
type GitRemoteDialogCmdRefType = {
  open: (mode: GitRemoteDialogModeType, previous?: GitRemote) => void;
};
export function useGitRemoteDialogCmd() {
  return React.useRef<GitRemoteDialogCmdRefType>({
    open: () => {},
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
  onSubmit: (values: { previous: null | GitRemote; next: GitRemote; mode: GitRemoteDialogModeType }) => void;
  cmdRef: React.RefObject<GitRemoteDialogCmdRefType>;
}) {
  const defaultValues = {
    name: defaultName,
    url: "https://github.com/rbbydotdev/test123",
    gitCorsProxy: Env.GitProtocolProxy, //"https://cors.isomorphic-git.org",
  };

  const form = useForm<GitRemoteFormValues>({
    resolver: zodResolver(gitRemoteSchema),
    defaultValues,
  });
  const prevRef = React.useRef<GitRemote | null>(null);
  const modeRef = React.useRef<GitRemoteDialogModeType>(GitRemoteDialogModes.ADD);
  const [showConnectionModal, setShowConnModal] = React.useState(false);

  useImperativeHandle(
    cmdRef,
    () =>
      ({
        open: (mode: GitRemoteDialogModeType, previous?: GitRemote) => {
          if (mode === "edit") {
            form.reset({ ...defaultValues, ...previous });
          }
          modeRef.current = mode;
          prevRef.current = previous ?? null;
          setOpen(true);
        },
      }) satisfies GitRemoteDialogCmdRefType
  );
  const [open, setOpen] = useState(false);

  function handleDialogOpenChange(isOpen: boolean) {
    if (showConnectionModal) {
      setShowConnModal(false);
      return;
    }
    setOpen(isOpen);
    if (!isOpen) {
      setShowConnModal(false);
      prevRef.current = null;
      modeRef.current = GitRemoteDialogModes.ADD;
      form.reset(defaultValues);
    }
  }

  function handleFormSubmit(values: GitRemoteFormValues) {
    onSubmit({ previous: prevRef.current, next: values, mode: modeRef.current });
    setOpen(false);
  }

  function handleCancel() {
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
                console.log("Selected connection:", rad.guid);
                form.setValue("authId", rad.guid);
                setShowConnModal(false);
              }}
              onClose={() => setShowConnModal(false)}
            />
          </div>
          <GitRemoteDialogInternal
            className={cn("col-start-1 row-start-1 min-w-0", { invisible: showConnectionModal })}
            mode={modeRef.current}
            form={form}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            onAddAuth={() => setShowConnModal(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
function useRemoteAuthForm(authId: string | undefined) {
  const [remoteAuth, setRemoteAuth] = useState<null | RemoteAuthDAO>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffect(async () => {
    if (authId) {
      console.log(authId);
      setRemoteAuth(await RemoteAuthDAO.GetByGuid(authId));
    }
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
  const [urlMode, setUrlMode] = useState<"manual" | "search">("manual");

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
                <FormLabel>{urlMode === "manual" ? "URL" : "Repo Name"}</FormLabel>
                {urlMode === "search" && (
                  <RepoSearchContainer
                    defaultValue={relPath(TryPathname(form.getValues("url")))}
                    onClose={() => setUrlMode("manual")}
                    onSelect={(repoName) => {
                      form.setValue("url", `https://github.com/${repoName}.git`);
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
                            autoFocus
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
            <Button
              variant={urlMode === "manual" ? "outline" : "default"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                setUrlMode(urlMode === "manual" ? "search" : "manual");
              }}
            >
              <Search />
            </Button>
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

function RepoSearchContainer({
  defaultValue,
  onClose,
  onSelect,
}: {
  defaultValue: string;
  onClose: () => void;
  onSelect: (repoName: string) => void;
}) {
  const [searchValue, setSearchValue] = useState(defaultValue);

  return (
    <div className="w-full relative">
      <RepoDropDown searchValue={searchValue} onSearchChange={setSearchValue} onClose={onClose} onSelect={onSelect} />
    </div>
  );
}

function RepoDropDown({
  searchValue,
  onSearchChange,
  onClose,
  onSelect,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (repoName: string) => void;
}) {
  // Dummy data - you can replace this with actual repo data
  const allRepos = useMemo(
    () => [
      "facebook/react",
      "microsoft/vscode",
      "vercel/next.js",
      "angular/angular",
      "vuejs/vue",
      "nodejs/node",
      "denoland/deno",
      "rust-lang/rust",
      "golang/go",
      "python/cpython",
      "something/something",
      "user/example-repo",
      "company/project-name",
      "developer/awesome-lib",
      "team/web-app",
    ],
    []
  );

  // Filter repos based on search
  const filteredRepos = useMemo(() => {
    if (!searchValue.trim()) return allRepos.slice(0, 8); // Show first 8 when no search
    return allRepos.filter((repo) => repo.toLowerCase().includes(searchValue.toLowerCase())).slice(0, 8); // Limit to 8 results
  }, [allRepos, searchValue]);

  const {
    activeIndex,
    resetActiveIndex,
    containerRef,
    handleKeyDown,
    getInputProps,
    getMenuProps,
    getItemProps,
    isItemActive,
  } = useKeyboardNavigation({
    onEnter: (activeIndex) => {
      if (activeIndex >= 0 && activeIndex < filteredRepos.length) {
        onSelect(filteredRepos[activeIndex]!);
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
  }, [filteredRepos, resetActiveIndex]);

  const handleItemClick = (repo: string) => {
    onSelect(repo);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Close dropdown if focus moves outside the component
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      onClose();
    }
  };

  return (
    <div ref={containerRef} className="w-full relative" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <Input
        {...getInputProps()}
        autoFocus
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search repositories..."
        className="w-full"
      />

      {filteredRepos.length > 0 && (
        <ul
          {...getMenuProps()}
          className="mt-2 block max-h-96 w-full justify-center overflow-scroll rounded-lg bg-sidebar drop-shadow-lg absolute top-10 z-10"
        >
          {filteredRepos.map((repo, index) => (
            <li key={repo} role="presentation" className="flex w-full flex-col rounded p-1">
              <button
                {...getItemProps(index)}
                onClick={() => handleItemClick(repo)}
                className="group flex h-8 min-w-0 items-center justify-start rounded-md border-2 _border-sidebar _bg-sidebar px-2 py-5 outline-none group-hover:border-ring focus:border-ring"
              >
                <div className="min-w-0 truncate text-md font-mono _text-sidebar-foreground/70">{repo}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {filteredRepos.length === 0 && searchValue && (
        <div className="absolute w-full top-10 z-10 bg-sidebar border border-t-0 rounded-b-lg shadow-lg">
          <div className="px-3 py-2 text-sm text-muted-foreground">No repositories found</div>
        </div>
      )}
    </div>
  );
}
