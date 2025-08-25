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
import { Env } from "@/lib/env";
import { relPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useImperativeHandle, useState } from "react";

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
                  <div className="w-full relative">
                    <Input
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setUrlMode("manual");
                        }
                      }}
                      // onBlur={(e) => setUrlMode("manual")}
                      defaultValue={relPath(TryPathname(form.getValues("url")))}
                    ></Input>
                    <RepoDropDown />
                  </div>
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

function RepoDropDown() {
  return (
    <div className="absolute max-h-32 overflow-y-scroll no-scrollbar bg-sidebar rounded-b-lg w-full top-10 flex-col">
      {new Array(5).fill(0).map((_, i) => (
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.click();
            }
          }}
          key={i}
          tabIndex={0}
          className="rounded py-2 px-2 mx-1 text-sm my-1 flex items-center justify-start mono focus:ring-ring focus:ring-1 hover:ring-ring hover:ring-1 cursor-pointer"
        >
          something/something
        </div>
      ))}
    </div>
  );
}
