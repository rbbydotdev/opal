"use client";

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
import { GitBranch, Info } from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GitRemote } from "@/features/git-repo/GitRepo";
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
  corsProxy: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .refine(
      (val) => val === undefined || (typeof val === "string" && /^https?:\/\//.test(val)),
      "CORS Proxy must be a valid HTTP/HTTPS URL"
    ),
});

type GitRemoteFormValues = z.infer<typeof gitRemoteSchema>;

const GitRemoteDialogModes = {
  ADD: "add",
  EDIT: "edit",
} as const;
type GitRemoteDialogModeType = (typeof GitRemoteDialogModes)[keyof typeof GitRemoteDialogModes];

function descForMode(mode: GitRemoteDialogModeType) {
  switch (mode) {
    case GitRemoteDialogModes.ADD:
      return "Add a new Git remote to your repository.";
    case GitRemoteDialogModes.EDIT:
      return "Edit an existing Git remote in your repository.";
  }
}
function titleForMode(mode: GitRemoteDialogModeType) {
  switch (mode) {
    case GitRemoteDialogModes.ADD:
      return "Add Git Remote";
    case GitRemoteDialogModes.EDIT:
      return "Edit Git Remote";
  }
}
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
    corsProxy: "https://cors.isomorphic-git.org",
  };
  const prevRef = React.useRef<GitRemote | null>(null);
  const modeRef = React.useRef<GitRemoteDialogModeType>(GitRemoteDialogModes.ADD);
  const form = useForm<GitRemoteFormValues>({
    resolver: zodResolver(gitRemoteSchema),
    defaultValues,
  });
  useImperativeHandle(
    cmdRef,
    () =>
      ({
        open: (mode: GitRemoteDialogModeType, previous?: GitRemote) => {
          modeRef.current = mode;
          form.reset(previous ?? defaultValues);
          prevRef.current = previous ?? null;
          setOpen(true);
        },
      } satisfies GitRemoteDialogCmdRefType)
  );
  const [open, setOpen] = useState(false);

  function handleDialogOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  }

  function handleFormSubmit(values: GitRemoteFormValues) {
    onSubmit({ previous: prevRef.current, next: values, mode: modeRef.current });
    setOpen(false);
    form.reset();
  }

  function handleCancel() {
    setOpen(false);
    form.reset();
  }

  const mode = modeRef.current;
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[26.5625rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {titleForMode(mode)}
          </DialogTitle>
          <DialogDescription>{descForMode(mode)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" placeholder="origin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      required
                      autoComplete="off"
                      autoFocus
                      placeholder="https://github.com/user/repo.git"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="corsProxy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CORS Proxy <CorsProxyTooltip />
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="off" placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">OK</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const CorsProxyTooltip = () => (
  <Tooltip>
    <TooltipTrigger>
      <Info className="w-3.5 h-3.5" />
    </TooltipTrigger>
    <TooltipContent>
      <p>Optional, but probably required</p>
    </TooltipContent>
  </Tooltip>
);
