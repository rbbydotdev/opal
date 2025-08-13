import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
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

import { AuthSelect } from "@/components/AuthSelect";
import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GitRemote } from "@/features/git-repo/GitRepo";
import { NotEnv } from "@/lib/notenv";
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
  defaultMode: GitRemoteDialogModeType = "add"
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
    gitCorsProxy: NotEnv.GitProtocolProxy, //"https://cors.isomorphic-git.org",
  };

  const form = useForm<GitRemoteFormValues>({
    resolver: zodResolver(gitRemoteSchema),
    defaultValues,
  });
  const prevRef = React.useRef<GitRemote | null>(null);
  const modeRef = React.useRef<GitRemoteDialogModeType>(GitRemoteDialogModes.ADD);
  const connModalKeyRef = React.useRef<string>("0");
  const authSelectKeyRef = React.useRef<string>("0");
  const [showConnectionModal, setShowConnModal] = React.useState(false);
  const resetConnModal = () => {
    connModalKeyRef.current = Date.now().toString();
    setShowConnModal(false);
  };
  const resetAuthSelect = () => {
    authSelectKeyRef.current = Date.now().toString();
  };

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
      resetConnModal();
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
      <DialogContent>
        <div className="grid relative max-w-full w-full min-w-0">
          <div className="col-start-1 row-start-1">
            <ConnectionsModalContent
              className={cn("w-full min-w-0", { hidden: !showConnectionModal })}
              mode={"add"}
              key={connModalKeyRef.current}
              onSuccess={(rad) => {
                resetConnModal();
                resetAuthSelect();
                form.setValue("authId", rad?.guid ?? "");
              }}
              // onOpenChange={(state) => {
              //   if (!state && showConnectionModal) resetConnModal();
              // }}
            />
          </div>
          <GitRemoteDialogInternal
            className={cn("col-start-1 row-start-1 min-w-0", { invisible: showConnectionModal })}
            mode={modeRef.current}
            form={form}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            onAddAuth={() => setShowConnModal(true)}
            authSelectKey={connModalKeyRef.current}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
function GitRemoteDialogInternal({
  className,
  mode,
  onSubmit,
  onAddAuth,
  authSelectKey = "git-remote-auth-select",
  onCancel,
  form,
}: {
  className?: string;
  authSelectKey?: string;
  mode: GitRemoteDialogModeType;
  onSubmit: (values: GitRemoteFormValues) => void;
  onAddAuth: () => void;
  onCancel: () => void;
  form: ReturnType<typeof useForm<GitRemoteFormValues>>;
}) {
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
            name="url"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>URL</FormLabel>
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
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="authId"
            render={({ field }) => (
              <FormItem className="w-full min-w-0">
                <FormLabel>Authentication</FormLabel>
                <FormControl>
                  <AuthSelect
                    key={authSelectKey}
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
