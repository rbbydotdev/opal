import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import React, { useImperativeHandle, useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const gitAuthorSchema = z.object({
  name: z
    .string()
    .min(1, "Author name is required")
    .max(100, "Author name is too long"),
  email: z
    .string()
    .min(1, "Author email is required")
    .email("Author email must be a valid email address")
    .max(100, "Author email is too long"),
});

export type GitAuthorFormValues = z.infer<typeof gitAuthorSchema>;

type GitAuthorDialogResult = {
  author: GitAuthorFormValues | null;
};

const NULL_GIT_AUTHOR_DIALOG_RESULT: GitAuthorDialogResult = {
  author: null,
};

type GitAuthorDialogCmdRefType = {
  open: (initialValues?: GitAuthorFormValues) => Promise<GitAuthorDialogResult>;
};

export function useGitAuthorDialogCmd() {
  return React.useRef<GitAuthorDialogCmdRefType>({
    open: async () => NULL_GIT_AUTHOR_DIALOG_RESULT,
  });
}

export function GitAuthorDialog({
  children,
  defaultValues = { name: "Opal Editor", email: "user@opaleditor.com" },
  onSubmit,
  cmdRef,
}: {
  children?: React.ReactNode;
  defaultValues?: GitAuthorFormValues;
  onSubmit?: (values: GitAuthorDialogResult & { author: GitAuthorFormValues }) => void;
  cmdRef: React.RefObject<GitAuthorDialogCmdRefType>;
}) {
  const form = useForm<GitAuthorFormValues>({
    resolver: zodResolver(gitAuthorSchema),
    defaultValues,
  });

  const [open, setOpen] = useState(false);
  const deferredPromiseRef = React.useRef<PromiseWithResolvers<GitAuthorDialogResult> | null>(null);

  useImperativeHandle(
    cmdRef,
    () =>
      ({
        open: (initialValues?: GitAuthorFormValues) => {
          deferredPromiseRef.current = Promise.withResolvers();
          if (initialValues) {
            form.reset(initialValues);
          } else {
            form.reset(defaultValues);
          }
          setOpen(true);
          return deferredPromiseRef.current.promise;
        },
      }) satisfies GitAuthorDialogCmdRefType
  );

  // Cleanup effect to ensure promise is always resolved
  React.useEffect(() => {
    return () => {
      deferredPromiseRef.current?.resolve(NULL_GIT_AUTHOR_DIALOG_RESULT);
      deferredPromiseRef.current = null;
    };
  }, []);

  function handleDialogOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      // Dialog is closing - resolve promise with null (cancelled)
      deferredPromiseRef.current?.resolve(NULL_GIT_AUTHOR_DIALOG_RESULT);
      deferredPromiseRef.current = null;
      form.reset(defaultValues);
    }
  }

  function handleFormSubmit(values: GitAuthorFormValues) {
    const result = { author: values };

    // Call legacy onSubmit if provided for backward compatibility
    onSubmit?.(result);

    // Resolve promise with result
    deferredPromiseRef.current?.resolve(result);
    deferredPromiseRef.current = null;
    setOpen(false);
  }

  function handleCancel() {
    // Resolve promise with null (cancelled)
    deferredPromiseRef.current?.resolve(NULL_GIT_AUTHOR_DIALOG_RESULT);
    deferredPromiseRef.current = null;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Configure Git Author
          </DialogTitle>
          <DialogDescription>
            Set your name and email for git commits. These will be used as the author information for all commits.
          </DialogDescription>
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
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}