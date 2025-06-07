"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { toast } from "@/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const workspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .min(2, { message: "Workspace name must be at least 2 characters." })
    .max(50, { message: "Workspace name must not exceed 50 characters." }),
  workspaceDescription: z.string().max(500, { message: "Description must not exceed 500 characters." }).optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

const defaultValues: Partial<WorkspaceFormValues> = {
  workspaceName: "",
};

export default function Page() {
  const { currentWorkspace } = useWorkspaceContext();
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues,
  });
  useEffect(() => {
    if (!currentWorkspace.isNull) {
      form.reset({
        workspaceName: currentWorkspace.name,
      });
      console.log(currentWorkspace.name, "reset");
    }
  }, [currentWorkspace, form]);

  function onSubmit(data: WorkspaceFormValues) {
    toast({
      title: "Workspace updated",
      description: "Your workspace settings have been updated.",
    });
    console.log(data);
  }

  function handleDeleteWorkspace() {
    toast({
      variant: "destructive",
      title: "Workspace deletion requested",
      description: "This action would delete your workspace.",
    });
  }

  return (
    <div className="flex w-full items-center justify-center">
      <div className="p-4 max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-4">Workspace Settings</h1>
        <div className="border-2 rounded-lg p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-4">General</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="workspaceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold">Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Workspace" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Save Changes</Button>
            </form>
          </Form>

          <h2 className="text-lg font-bold mt-8 mb-4">Danger Zone</h2>
          <div className="flex flex-col space-y-4">
            <Button variant="destructive" onClick={handleDeleteWorkspace}>
              Delete Workspace
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
